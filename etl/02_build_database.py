import os
import glob
import pandas as pd
from sqlalchemy import create_engine

def main():
    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(base_dir, '..', 'data')
    backend_resources_dir = os.path.join(base_dir, '..', 'backend', 'src', 'main', 'resources')
    db_path = os.path.join(backend_resources_dir, 'rappi_logs.db')

    # Extraction
    csv_files = glob.glob(os.path.join(data_dir, '*.csv'))
    
    if not csv_files:
        print("No CSV files found.")
        return

    dfs = []
    for f in csv_files:
        try:
            df = pd.read_csv(f)
            id_vars = [col for col in df.columns if 'GMT' not in col and col not in ['Plot name', 'metric (sf_metric)', 'Value Prefix', 'Value Suffix'] or col in ['Plot name', 'metric (sf_metric)', 'Value Prefix', 'Value Suffix']]
            id_vars = list(df.columns[:4])
            df_melted = df.melt(id_vars=id_vars, var_name='timestamp', value_name='value')
            dfs.append(df_melted)
        except Exception as e:
            print(f"Error reading {f}: {e}")

    # Transformation
    df_unified = pd.concat(dfs, ignore_index=True)
    df_unified.drop_duplicates(inplace=True)

    time_keywords = ['date', 'time', 'timestamp', 'created_at']
    for col in df_unified.columns:
        if any(kw in str(col).lower() for kw in time_keywords):
            try:
                df_unified[col] = pd.to_datetime(df_unified[col], errors='coerce')
            except Exception:
                pass


    # Conform to JPA conventions
    df_unified.reset_index(drop=True, inplace=True)
    df_unified.reset_index(inplace=True)
    df_unified.rename(columns={'index': 'id'}, inplace=True)
    
    df_unified.columns = ['id', 'plot_name', 'metric', 'value_prefix', 'value_suffix', 'timestamp', 'status_value']

    # Load
    os.makedirs(backend_resources_dir, exist_ok=True)
    
    engine = create_engine(f"sqlite:///{db_path}")
    df_unified.to_sql('availability_logs', engine, if_exists='replace', index=False)

    print(f"Total files processed: {len(csv_files)}")
    print(f"Final records shape: {df_unified.shape[0]} rows, {df_unified.shape[1]} columns")
    print("\nFinal Schema saved to database:")
    print(df_unified.dtypes)

if __name__ == "__main__":
    main()
