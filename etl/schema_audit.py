"""
schema_audit.py -- Deep Schema Audit
Read 5 random CSV files and print exact column names + sample values.
"""
import glob, os, random, sys
import pandas as pd

# Force UTF-8 output on Windows terminals
sys.stdout.reconfigure(encoding='utf-8')

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

files = sorted(glob.glob(os.path.join(DATA_DIR, '**', '*.csv'), recursive=True))
random.seed(42)
sample = random.sample(files, 5)

SEP = "=" * 70

for path in sample:
    print(SEP)
    print(f"FILE: {os.path.basename(path)}")
    print(SEP)
    try:
        df = pd.read_csv(path, encoding='utf-8', encoding_errors='replace', nrows=5)
    except Exception as e:
        print(f"  [ERROR] {e}")
        continue

    print(f"  Shape         : {df.shape[0]} rows x {df.shape[1]} columns")
    print(f"  Total columns : {df.shape[1]}")
    print()

    # First 4 columns are the "fixed" ID columns
    fixed_cols = list(df.columns[:4])
    pivot_cols = list(df.columns[4:])

    print("  -- FIXED / ID COLUMNS --")
    for col in fixed_cols:
        sample_vals = df[col].dropna().unique()[:3].tolist()
        dtype = str(df[col].dtype)
        print(f"    [{dtype:>10}]  col_name='{col}'")
        print(f"                  sample   ={sample_vals}")

    print()
    print(f"  -- PIVOT / TIMESTAMP COLUMNS ({len(pivot_cols)} total) --")
    # Show first 3 and last 1 pivot column to understand the time range
    show_pivots = pivot_cols[:3] + (pivot_cols[-1:] if len(pivot_cols) > 3 else [])
    for col in show_pivots:
        sample_vals = df[col].dropna().unique()[:3].tolist()
        dtype = str(df[col].dtype)
        # Truncate long column names (timestamps)
        short_col = col[:60] + '...' if len(col) > 60 else col
        print(f"    [{dtype:>10}]  col_name='{short_col}'")
        print(f"                  sample   ={sample_vals}")
    if len(pivot_cols) > 4:
        print(f"    ... ({len(pivot_cols) - 4} more pivot columns not shown)")

    print()

print(SEP)
print("AUDIT COMPLETE")
print(SEP)
