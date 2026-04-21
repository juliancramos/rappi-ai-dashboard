import os
import glob
import pandas as pd
from sqlalchemy import create_engine

def main():
    # Strict absolute paths to avoid context issues
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, '..', 'data')
    backend_dir = os.path.join(base_dir, '..', 'backend')
    db_path = os.path.join(backend_dir, 'rappi_logs.db')

    # Convert to SQLAlchemy-compatible format
    db_path_sql = db_path.replace('\\', '/')

    print(f"Searching for CSVs in: {data_dir}")

    # Recursive extraction
    csv_files = glob.glob(os.path.join(data_dir, '**', '*.csv'), recursive=True)
    
    if not csv_files:
        print("Error: No CSV files found. Make sure the files are unzipped in the /data folder")
        return

    dfs = []
    for f in csv_files:
        try:
            df = pd.read_csv(f)
            # Assume the first 4 columns are the base columns (id_vars)
            id_vars = list(df.columns[:4])
            df_melted = df.melt(id_vars=id_vars, var_name='timestamp', value_name='value')
            dfs.append(df_melted)
        except Exception as e:
            print(f"Error reading {f}: {e}")

    if not dfs:
        print("Error: No DataFrame could be processed.")
        return

    # Transformation
    print("Concatenating and cleaning data...")
    df_unified = pd.concat(dfs, ignore_index=True)
    df_unified.drop_duplicates(inplace=True)

    time_keywords = ['date', 'time', 'timestamp', 'created_at']
    # Removing to_datetime coercion so raw strings are pushed to SQLite

    # JPA conventions (Primary key and Snake Case)
    df_unified.reset_index(drop=True, inplace=True)
    df_unified.reset_index(inplace=True)
    df_unified.rename(columns={'index': 'id'}, inplace=True)
    
    df_unified.columns = ['id', 'plot_name', 'metric', 'value_prefix', 'value_suffix', 'timestamp', 'status_value']

    # Load
    print("Saving to SQLite database...")
    os.makedirs(backend_dir, exist_ok=True)
    
    engine = create_engine(f"sqlite:///{db_path_sql}")
    df_unified.to_sql('availability_logs', engine, if_exists='replace', index=False)

    print("-" * 30)
    print(f"Processed files: {len(csv_files)}")
    print(f"Final records: {df_unified.shape[0]} rows, {df_unified.shape[1]} columns")
    print(f"Database successfully saved at: {db_path}")

if __name__ == "__main__":
    main()