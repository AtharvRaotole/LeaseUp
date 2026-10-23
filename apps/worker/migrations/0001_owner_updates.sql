-- Box deploy 20 (since production main @ 93f6560): owner update share links
CREATE TABLE IF NOT EXISTS owner_updates (
  update_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_owner_updates_created ON owner_updates(created_at);
