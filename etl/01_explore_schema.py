import os
import glob
import pandas as pd

def main():
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    csv_files = glob.glob(os.path.join(data_dir, '*.csv'))
    
    if not csv_files:
        print("No CSV files found in the data directory.")
        return

    first_csv_file = csv_files[0]
    
    try:
        df = pd.read_csv(first_csv_file)
        
        print(f"--- Exploring Schema for: {os.path.basename(first_csv_file)} ---")
        print("\n1. Column Names:")
        print(df.columns.tolist())
        
        print("\n2. Inferred Data Types:")
        print(df.dtypes)
        
        print("\n3. First 5 Rows:")
        print(df.head())
        
    except Exception as e:
        print(f"Error reading {first_csv_file}: {e}")

if __name__ == "__main__":
    main()
