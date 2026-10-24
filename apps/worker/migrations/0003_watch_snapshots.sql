-- Box deploy 20: immutable analyze snapshots for watchlist diff / recheck
CREATE TABLE IF NOT EXISTS watch_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  watch_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_watch_snapshots_watch ON watch_snapshots(watch_id, created_at DESC);
