import glob, os

files = glob.glob('../data/**/*.csv', recursive=True)
seen_schemas = {}
for f in files:
    try:
        with open(f, encoding='utf-8', errors='replace') as fh:
            header = fh.readline().strip()
        if header not in seen_schemas:
            seen_schemas[header] = f
    except:
        pass

print(f'Total CSV files: {len(files)}')
print(f'Unique schemas: {len(seen_schemas)}')
print()
for schema, example in list(seen_schemas.items()):
    cols = [c.strip() for c in schema.split(',')]
    print(f'FILE: {os.path.basename(example)}')
    print(f'COLS ({len(cols)}): {cols}')
    print()
