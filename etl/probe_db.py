import sqlite3

db = '../backend/rappi_logs.db'
con = sqlite3.connect(db)
cur = con.cursor()

print("=== /stats — countTotalAndOfflineRecords + MAX ===")
cur.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status_value = 0 THEN 1 ELSE 0 END) as offline FROM availability_logs")
row = cur.fetchone()
total, offline = row
online = total - offline
uptime = online / total * 100 if total else 0
print(f"  total={total:,}  offline={offline}  online={online:,}  uptime={uptime:.4f}%")

cur.execute("SELECT MAX(status_value) FROM availability_logs")
peak = cur.fetchone()[0]
print(f"  peak_visibility={peak:,}")

print()
print("=== /health-series — hourly buckets (first 5 + last 1) ===")
cur.execute("""
    SELECT SUBSTR(timestamp, 1, 13) || ':00:00' AS hour_bucket,
           AVG(status_value)                    AS avg_visibility,
           COUNT(id)                            AS sample_count
    FROM   availability_logs
    WHERE  timestamp IS NOT NULL
    GROUP  BY hour_bucket
    ORDER  BY hour_bucket ASC
""")
rows = cur.fetchall()
print(f"  Total hourly buckets: {len(rows)}")
for r in rows[:5]:
    print(f"  {r[0]}  avg={r[1]:,.0f}  samples={r[2]}")
print(f"  ...last bucket: {rows[-1]}")

print()
print("=== /incidents — status_value = 0 ===")
cur.execute("SELECT id, plot_name, metric, timestamp, status_value FROM availability_logs WHERE status_value = 0 ORDER BY timestamp ASC")
incidents = cur.fetchall()
print(f"  Total incidents: {len(incidents)}")
for r in incidents:
    print(f"  id={r[0]}  ts={r[3]}  sv={r[4]}")

con.close()
