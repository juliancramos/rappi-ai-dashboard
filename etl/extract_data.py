"""
extract_data.py  —  Re-engineered ETL Pipeline  (v3)
=====================================================

SCHEMA (confirmed via audit across all 201 CSV files)
------------------------------------------------------
Every file has exactly 1 data row and N+4 columns:

    Fixed ID columns (4):
        'Plot name'          -> plot_name   (TEXT)   always 'NOW' in source
        'metric (sf_metric)' -> metric      (TEXT)   e.g. 'synthetic_monitoring_visible_stores'
        'Value Prefix'       -> value_prefix (REAL)  always NULL in source
        'Value Suffix'       -> value_suffix (REAL)  always NULL in source

    Pivot / Timestamp columns (N, varies per file):
        Column header = JS timestamp string
            e.g. 'Mon Feb 09 2026 15:59:40 GMT-0500 (hora estándar de Colombia)'
        Cell value    = INTEGER store count at that timestamp
            e.g. 5099150

ETL transforms: wide → long via melt, then:
    - Parses the JS timestamp header into ISO-8601 SQL format
    - Casts status_value to INTEGER (store count, may be 0 for offline events)
    - Streams each file directly into SQLite (no concat in RAM)
    - Resets availability_logs with DELETE + sqlite_sequence reset
"""

import glob
import logging
import os
import re
import sqlite3
import sys
from datetime import datetime

import pandas as pd

# ---------------------------------------------------------------------------
# Console output — UTF-8 safe, single-line messages only
# ---------------------------------------------------------------------------
sys.stdout.reconfigure(encoding="utf-8")
logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# STRICT column definitions  (no positional indexing)
# ---------------------------------------------------------------------------

# The four fixed ID columns — exact names as they appear in the CSVs.
# Any alias recognised via case-insensitive strip matching.
STORE_NAME_ALIASES  = {"plot name", "store_name", "name", "shop"}
METRIC_ALIASES      = {"metric (sf_metric)", "metric", "variable"}
VAL_PREFIX_ALIASES  = {"value prefix"}
VAL_SUFFIX_ALIASES  = {"value suffix"}

# Canonical output names
COL_STORE   = "plot_name"
COL_METRIC  = "metric"
COL_PREFIX  = "value_prefix"
COL_SUFFIX  = "value_suffix"
COL_TS      = "timestamp"
COL_STATUS  = "status_value"

# Output column order (matches DB schema)
OUTPUT_COLS = [COL_STORE, COL_METRIC, COL_PREFIX, COL_SUFFIX, COL_TS, COL_STATUS]

# ---------------------------------------------------------------------------
# Timestamp parser
# ---------------------------------------------------------------------------
# JS format example:  "Mon Feb 09 2026 15:59:40 GMT-0500 (hora estándar de Colombia)"
# Target SQL format:  "2026-02-09 15:59:40"
_TS_REGEX = re.compile(
    r"""
    \w+\s+          # Day-of-week  (Mon, Tue …)
    (\w+)\s+        # Month abbrev  → group 1
    (\d{1,2})\s+    # Day           → group 2
    (\d{4})\s+      # Year          → group 3
    (\d{2}):(\d{2}):(\d{2})  # HH:MM:SS → groups 4-6
    """,
    re.VERBOSE,
)

_MONTH_MAP = {
    "Jan": 1,  "Feb": 2,  "Mar": 3,  "Apr": 4,
    "May": 5,  "Jun": 6,  "Jul": 7,  "Aug": 8,
    "Sep": 9,  "Oct": 10, "Nov": 11, "Dec": 12,
}


def parse_js_timestamp(raw: str) -> str | None:
    """
    Convert a JS-style timestamp column header to 'YYYY-MM-DD HH:MM:SS'.
    Returns None if the string does not match the expected pattern
    (i.e., it is a fixed ID column, not a timestamp pivot).
    """
    m = _TS_REGEX.search(raw)
    if not m:
        return None
    month_abbr, day, year, hh, mm, ss = m.group(1), m.group(2), m.group(3), \
                                         m.group(4), m.group(5), m.group(6)
    month_num = _MONTH_MAP.get(month_abbr)
    if month_num is None:
        return None
    try:
        dt = datetime(int(year), month_num, int(day), int(hh), int(mm), int(ss))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Schema resolver
# ---------------------------------------------------------------------------

def resolve_rename_map(raw_columns: list[str]) -> dict[str, str]:
    """
    Return a mapping  { original_col_name -> canonical_name }
    for the four fixed ID columns found in raw_columns.
    Unrecognised columns (timestamp pivots) are NOT included.
    """
    rename: dict[str, str] = {}
    for col in raw_columns:
        norm = col.strip().lower()
        if norm in STORE_NAME_ALIASES:
            rename[col] = COL_STORE
        elif norm in METRIC_ALIASES:
            rename[col] = COL_METRIC
        elif norm in VAL_PREFIX_ALIASES:
            rename[col] = COL_PREFIX
        elif norm in VAL_SUFFIX_ALIASES:
            rename[col] = COL_SUFFIX
    return rename


# ---------------------------------------------------------------------------
# Per-file processor
# ---------------------------------------------------------------------------

def process_file(filepath: str) -> pd.DataFrame | None:
    """
    Load one CSV → rename fixed columns → melt pivot columns → clean data.
    Returns a tidy DataFrame or None if the file must be skipped.
    """
    fname = os.path.basename(filepath)

    # 1. Load
    try:
        df = pd.read_csv(filepath, encoding="utf-8", encoding_errors="replace")
    except Exception as exc:
        log.warning("  [ERROR] Cannot read '%s': %s", fname, exc)
        return None

    if df.empty or df.shape[1] < 2:
        log.warning("  [SKIP]  '%s' — empty or too few columns.", fname)
        return None

    # 2. Resolve & rename fixed ID columns
    rename_map = resolve_rename_map(list(df.columns))

    if COL_STORE not in rename_map.values():
        log.warning(
            "  [SKIP]  '%s' — no store-name column found. Headers[:5]: %s",
            fname, list(df.columns)[:5],
        )
        return None

    df = df.rename(columns=rename_map)

    # 3. Determine id_vars (fixed cols present after rename) and pivot cols
    id_vars     = [c for c in [COL_STORE, COL_METRIC, COL_PREFIX, COL_SUFFIX]
                   if c in df.columns]
    pivot_cols  = [c for c in df.columns if c not in id_vars]

    if not pivot_cols:
        log.warning("  [SKIP]  '%s' — no pivot (timestamp) columns found.", fname)
        return None

    # 4. Melt: each timestamp column becomes a row
    df_long = df.melt(
        id_vars=id_vars,
        value_vars=pivot_cols,      # only the actual metric/timestamp columns
        var_name="raw_timestamp",
        value_name=COL_STATUS,
    )

    # 5. Parse timestamp headers → ISO-8601 SQL strings
    df_long[COL_TS] = df_long["raw_timestamp"].map(parse_js_timestamp)

    # Log any headers that failed to parse (shouldn't happen on known data)
    bad_ts = df_long[COL_TS].isna().sum()
    if bad_ts:
        log.warning(
            "  [WARN]  '%s' — %d rows had unparseable timestamp headers; dropping.",
            fname, bad_ts,
        )

    df_long = df_long.dropna(subset=[COL_TS])
    df_long = df_long.drop(columns=["raw_timestamp"])

    # 6. Coerce status_value to numeric integer (store count; 0 = offline event)
    df_long[COL_STATUS] = pd.to_numeric(df_long[COL_STATUS], errors="coerce")
    null_status = df_long[COL_STATUS].isna().sum()
    if null_status:
        log.warning(
            "  [WARN]  '%s' — %d rows had non-numeric status_value; set to NULL.",
            fname, null_status,
        )
    # Keep NULLs rather than dropping; integer NaN requires float dtype in pandas
    df_long[COL_STATUS] = df_long[COL_STATUS].astype("Int64")  # nullable integer

    # 7. Ensure all output columns exist (fill absent ones with None)
    for col in OUTPUT_COLS:
        if col not in df_long.columns:
            df_long[col] = None

    return df_long[OUTPUT_COLS]


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

# DROP + CREATE ensures the table starts fresh with a clean AUTOINCREMENT counter.
# SQLite resets the sequence automatically when the table is recreated.
DROP_TABLE_SQL  = "DROP TABLE IF EXISTS availability_logs;"
CREATE_TABLE_SQL = """
CREATE TABLE availability_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_name    TEXT,
    metric       TEXT,
    value_prefix REAL,
    value_suffix REAL,
    timestamp    TEXT,
    status_value INTEGER
);
"""

INSERT_SQL = """
INSERT INTO availability_logs
    (plot_name, metric, value_prefix, value_suffix, timestamp, status_value)
VALUES (?, ?, ?, ?, ?, ?);
"""


def init_db(conn: sqlite3.Connection) -> None:
    """Drop and recreate availability_logs — guarantees clean IDs from 1."""
    cur = conn.cursor()
    cur.execute(DROP_TABLE_SQL)
    cur.execute(CREATE_TABLE_SQL)
    conn.commit()
    log.info("  availability_logs dropped and recreated. Auto-increment starts at 1.")


# ---------------------------------------------------------------------------
# Main ETL
# ---------------------------------------------------------------------------

def main() -> None:
    base_dir    = os.path.dirname(os.path.abspath(__file__))
    data_dir    = os.path.join(base_dir, "..", "data")
    backend_dir = os.path.join(base_dir, "..", "backend")
    db_path     = os.path.join(backend_dir, "rappi_logs.db")

    log.info("=" * 66)
    log.info("Rappi Availability ETL  —  Re-Engineered Pipeline  (v3)")
    log.info("=" * 66)
    log.info("Data source : %s", os.path.abspath(data_dir))
    log.info("Database    : %s", os.path.abspath(db_path))
    log.info("")

    # ------------------------------------------------------------------
    # Step 1: Discover CSV files
    # ------------------------------------------------------------------
    csv_files   = sorted(glob.glob(os.path.join(data_dir, "**", "*.csv"), recursive=True))
    total_files = len(csv_files)

    if not total_files:
        log.error("[FATAL] No CSV files found in %s — aborting.", data_dir)
        return

    log.info("Found %d CSV files.", total_files)
    log.info("")

    # ------------------------------------------------------------------
    # Step 2: Connect to DB — purge + reset
    # ------------------------------------------------------------------
    os.makedirs(backend_dir, exist_ok=True)
    conn = sqlite3.connect(db_path)
    init_db(conn)
    log.info("")

    # ------------------------------------------------------------------
    # Step 3: Process each file and stream-insert
    # ------------------------------------------------------------------
    skipped_files:      list[str] = []
    total_rows_inserted: int      = 0

    for idx, filepath in enumerate(csv_files, start=1):
        print(f"  Processing file {idx:>3}/{total_files}...", end="\r", flush=True)

        df = process_file(filepath)

        if df is None:
            skipped_files.append(os.path.basename(filepath))
            continue

        # Stream-insert via executemany — SQLite assigns AUTOINCREMENT ids itself
        rows_to_insert = [
            (
                row[COL_STORE],
                row[COL_METRIC],
                row.get(COL_PREFIX),
                row.get(COL_SUFFIX),
                row[COL_TS],
                None if pd.isna(row[COL_STATUS]) else int(row[COL_STATUS]),
            )
            for row in df.to_dict(orient="records")
        ]
        conn.executemany(INSERT_SQL, rows_to_insert)
        total_rows_inserted += len(rows_to_insert)

    print(" " * 50, end="\r")  # clear progress line
    conn.commit()

    # ------------------------------------------------------------------
    # Step 4: Verification query — 5 rows related to availability/status
    # ------------------------------------------------------------------
    log.info("")
    log.info("-- VERIFICATION: 5 sample rows from availability_logs --")
    log.info("")

    cur = conn.cursor()

    # Count totals
    cur.execute("SELECT COUNT(*) FROM availability_logs")
    db_total = cur.fetchone()[0]

    cur.execute(
        "SELECT COUNT(*) FROM availability_logs "
        "WHERE plot_name IS NOT NULL AND trim(plot_name) != ''"
    )
    valid_store = cur.fetchone()[0]

    # Sample rows for metric related to availability/status (store count metric)
    cur.execute(
        """
        SELECT id, plot_name, metric, timestamp, status_value
        FROM   availability_logs
        WHERE  lower(metric) LIKE '%visible%'
            OR lower(metric) LIKE '%availab%'
            OR lower(metric) LIKE '%status%'
            OR lower(metric) LIKE '%store%'
        LIMIT 5
        """
    )
    rows = cur.fetchall()

    log.info("  %-6s %-10s %-40s %-22s %s",
             "id", "plot_name", "metric", "timestamp", "status_value")
    log.info("  %s", "-" * 95)
    for row in rows:
        rid, pname, metric, ts, sv = row
        log.info("  %-6s %-10s %-40s %-22s %s", rid, pname, metric[:38], ts, sv)

    # Offline events (status_value = 0) — shows 0s are captured correctly
    cur.execute(
        "SELECT COUNT(*) FROM availability_logs WHERE status_value = 0"
    )
    offline_count = cur.fetchone()[0]

    conn.close()

    # ------------------------------------------------------------------
    # Step 5: Final report
    # ------------------------------------------------------------------
    log.info("")
    log.info("=" * 66)
    log.info("ETL COMPLETE  —  SUMMARY")
    log.info("=" * 66)
    log.info("  CSV files found             : %d", total_files)
    log.info("  CSV files processed         : %d", total_files - len(skipped_files))
    log.info("  CSV files skipped           : %d", len(skipped_files))
    log.info("  Rows inserted               : %d", total_rows_inserted)
    log.info("  Rows confirmed in DB        : %d", db_total)
    log.info("  Rows with valid plot_name   : %d", valid_store)
    log.info("  Offline events (value = 0)  : %d", offline_count)
    log.info("  Database path               : %s", os.path.abspath(db_path))

    if skipped_files:
        log.info("")
        log.info("  Skipped files (%d):", len(skipped_files))
        for fname in skipped_files:
            log.info("    - %s", fname)

    log.info("=" * 66)


if __name__ == "__main__":
    main()
