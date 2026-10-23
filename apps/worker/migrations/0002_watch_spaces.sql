-- Box deploy 20: broker watchlist (per workspace cookie)
CREATE TABLE IF NOT EXISTS watch_spaces (
  watch_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  address TEXT NOT NULL,
  address_key TEXT NOT NULL,
  radius_km REAL NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_watch_spaces_workspace ON watch_spaces(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_spaces_workspace_address ON watch_spaces(workspace_id, address_key, radius_km);
