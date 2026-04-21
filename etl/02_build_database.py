"""
02_build_database.py — Schema-Aware ETL Pipeline
=================================================
Extracts data from wide-format CSV files (Plot name | metric | Value Prefix |
Value Suffix | <timestamp_col_1> | <timestamp_col_2> | ...) and loads them into
a normalized SQLite database table `availability_logs`.

Schema Discovery (confirmed across all 201 files):
  - Column 0: 'Plot name'          → plot_name
  - Column 1: 'metric (sf_metric)' → metric
  - Column 2: 'Value Prefix'       → value_prefix
  - Column 3: 'Value Suffix'       → value_suffix
  - Column 4+: <JS timestamp str>  → melted into `timestamp` / `status_value`
"""

import os
import glob
import sqlite3
import pandas as pd

# ---------------------------------------------------------------------------
# Constants — exact column names as they appear in the source CSV files
# ---------------------------------------------------------------------------
PLOT_NAME_COL   = 'Plot name'
METRIC_COL      = 'metric (sf_metric)'
VALUE_PREFIX_COL = 'Value Prefix'
VALUE_SUFFIX_COL = 'Value Suffix'

ID_VARS = [PLOT_NAME_COL, METRIC_COL, VALUE_PREFIX_COL, VALUE_SUFFIX_COL]

# Fallback: if a file has slight name variations, detect by position
FIXED_COL_COUNT = 4


def detect_id_vars(columns: list) -> list:
    """
    Attempt to identify the 4 fixed ID columns by exact name match first,
    then fall back to position-based detection with a warning.
    """
    exact_match = all(c in columns for c in ID_VARS)
    if exact_match:
        return ID_VARS

    # Fallback: use first FIXED_COL_COUNT columns and log a warning
    fallback = list(columns[:FIXED_COL_COUNT])
    print(f"  [WARN] Non-standard headers detected. Falling back to positional id_vars: {fallback}")
    return fallback


def normalize_row_columns(df_melted: pd.DataFrame, id_vars: list) -> pd.DataFrame:
    """
    Rename whatever id_vars were detected into the canonical snake_case names
    expected by the JPA entity.
    """
    rename_map = {
        id_vars[0]: 'plot_name',
        id_vars[1]: 'metric',
        id_vars[2]: 'value_prefix',
        id_vars[3]: 'value_suffix',
    }
    return df_melted.rename(columns=rename_map)


def process_file(filepath: str) -> pd.DataFrame | None:
    """
    Read a single CSV, detect the schema, melt it from wide to long format,
    and return a normalized DataFrame. Returns None on failure.
    """
    try:
        df = pd.read_csv(filepath, encoding='utf-8', encoding_errors='replace')
    except Exception as e:
        print(f"  [ERROR] Could not read '{os.path.basename(filepath)}': {e}")
        return None

    if df.shape[1] < FIXED_COL_COUNT + 1:
        print(f"  [SKIP] '{os.path.basename(filepath)}' has fewer than {FIXED_COL_COUNT + 1} columns — skipping.")
        return None

    id_vars = detect_id_vars(list(df.columns))
    timestamp_cols = [c for c in df.columns if c not in id_vars]

    if not timestamp_cols:
        print(f"  [SKIP] '{os.path.basename(filepath)}' has no timestamp columns — skipping.")
        return None

    # Melt: each timestamp column becomes a row
    df_melted = df.melt(
        id_vars=id_vars,
        value_vars=timestamp_cols,
        var_name='timestamp',
        value_name='status_value'
    )

    # Normalize column names to schema-canonical names
    df_normalized = normalize_row_columns(df_melted, id_vars)

    return df_normalized


def main():
    base_dir    = os.path.dirname(os.path.abspath(__file__))
    data_dir    = os.path.join(base_dir, '..', 'data')
    backend_dir = os.path.join(base_dir, '..', 'backend')
    db_path     = os.path.join(backend_dir, 'rappi_logs.db')

    print("=" * 60)
    print("Rappi Availability ETL — Schema-Aware Pipeline")
    print("=" * 60)
    print(f"Data source : {os.path.abspath(data_dir)}")
    print(f"Database    : {os.path.abspath(db_path)}")
    print()

    # -----------------------------------------------------------------------
    # Step 1: Discover all CSV files
    # -----------------------------------------------------------------------
    csv_files = glob.glob(os.path.join(data_dir, '**', '*.csv'), recursive=True)
    if not csv_files:
        print("[FATAL] No CSV files found. Ensure the /data directory is populated.")
        return

    print(f"Found {len(csv_files)} CSV files. Processing...")
    print()

    # -----------------------------------------------------------------------
    # Step 2: Extract and melt each file
    # -----------------------------------------------------------------------
    frames = []
    skipped = 0
    for i, filepath in enumerate(csv_files, 1):
        print(f"  [{i:03d}/{len(csv_files)}] {os.path.basename(filepath)}")
        df = process_file(filepath)
        if df is not None:
            frames.append(df)
        else:
            skipped += 1

    if not frames:
        print("[FATAL] No DataFrames were produced. Aborting.")
        return

    # -----------------------------------------------------------------------
    # Step 3: Concatenate and deduplicate
    # -----------------------------------------------------------------------
    print()
    print("Concatenating all frames...")
    df_all = pd.concat(frames, ignore_index=True)
    before_dedup = len(df_all)
    df_all.drop_duplicates(inplace=True)
    after_dedup = len(df_all)
    print(f"  Rows before dedup : {before_dedup:,}")
    print(f"  Rows after dedup  : {after_dedup:,}")
    print(f"  Duplicates removed: {before_dedup - after_dedup:,}")

    # -----------------------------------------------------------------------
    # Step 4: Filter out rows where plot_name is null/empty
    # -----------------------------------------------------------------------
    valid_mask = df_all['plot_name'].notna() & (df_all['plot_name'].str.strip() != '')
    invalid_count = (~valid_mask).sum()
    if invalid_count > 0:
        print(f"  [WARN] {invalid_count:,} rows have a null/empty plot_name — logging but keeping in DB.")

    # -----------------------------------------------------------------------
    # Step 5: Add auto-increment primary key
    # -----------------------------------------------------------------------
    df_all.reset_index(drop=True, inplace=True)
    df_all.insert(0, 'id', range(1, len(df_all) + 1))

    # Ensure correct column order matching the JPA entity
    final_cols = ['id', 'plot_name', 'metric', 'value_prefix', 'value_suffix', 'timestamp', 'status_value']
    df_all = df_all[final_cols]

    # -----------------------------------------------------------------------
    # Step 6: Load into SQLite (TRUNCATE + INSERT)
    # -----------------------------------------------------------------------
    print()
    print("Loading into SQLite...")
    os.makedirs(backend_dir, exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # DROP + CREATE is cleaner than TRUNCATE for SQLite (no TRUNCATE command)
    cursor.execute("DROP TABLE IF EXISTS availability_logs")
    conn.commit()

    # Write all rows using pandas (creates the table with correct schema)
    df_all.to_sql('availability_logs', conn, if_exists='replace', index=False)
    conn.commit()

    # -----------------------------------------------------------------------
    # Step 7: Validation query
    # -----------------------------------------------------------------------
    total_records = cursor.execute("SELECT COUNT(*) FROM availability_logs").fetchone()[0]
    valid_store_records = cursor.execute(
        "SELECT COUNT(*) FROM availability_logs WHERE plot_name IS NOT NULL AND trim(plot_name) != ''"
    ).fetchone()[0]
    conn.close()

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    print()
    print("=" * 60)
    print("ETL COMPLETE — SUMMARY")
    print("=" * 60)
    print(f"  CSV files processed       : {len(csv_files) - skipped} / {len(csv_files)}")
    print(f"  CSV files skipped (errors): {skipped}")
    print(f"  Total records processed   : {total_records:,}")
    print(f"  Records with valid Store Name: {valid_store_records:,}")
    print(f"  Records with null plot_name  : {total_records - valid_store_records:,}")
    print(f"  Database saved at: {os.path.abspath(db_path)}")
    print("=" * 60)


if __name__ == "__main__":
    main()