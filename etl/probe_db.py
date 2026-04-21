import sqlite3

db = '../backend/rappi_logs.db'
con = sqlite3.connect(db)
cur = con.cursor()

cur.execute("SELECT COUNT(*) FROM availability_logs")
total = cur.fetchone()[0]

cur.execute("SELECT DISTINCT plot_name FROM availability_logs LIMIT 10")
names = [r[0] for r in cur.fetchall()]

cur.execute("SELECT plot_name, metric, timestamp, status_value FROM availability_logs LIMIT 3")
samples = cur.fetchall()

print(f"Total rows: {total:,}")
print(f"Sample plot_names: {names}")
print("Sample rows:")
for r in samples:
    print(" ", r)

con.close()
