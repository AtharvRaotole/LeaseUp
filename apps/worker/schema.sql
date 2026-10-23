-- Rate limiting tables
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Analysis run logs
CREATE TABLE IF NOT EXISTS analysis_runs (
  run_id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  status TEXT NOT NULL,
  result TEXT,
  error TEXT,
  ip_address TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_created ON analysis_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_ip ON analysis_runs(ip_address);

-- API call metrics
CREATE TABLE IF NOT EXISTS api_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  latency_ms INTEGER,
  cached BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_api_metrics_provider ON api_metrics(provider, created_at);

-- Shareable portfolio batches
CREATE TABLE IF NOT EXISTS portfolios (
  portfolio_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_portfolios_created ON portfolios(created_at);

-- Immutable shareable site pitch packs
CREATE TABLE IF NOT EXISTS pitch_packs (
  pitch_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_pitch_packs_created ON pitch_packs(created_at);

-- Immutable shareable owner pipeline updates (per property)
CREATE TABLE IF NOT EXISTS owner_updates (
  update_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_owner_updates_created ON owner_updates(created_at);

-- Broker watchlist (saved report addresses and analyze snapshots)
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

CREATE TABLE IF NOT EXISTS watch_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  watch_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_watch_snapshots_watch ON watch_snapshots(watch_id, created_at DESC);

-- Autonomous full prospecting agent runs
CREATE TABLE IF NOT EXISTS prospecting_jobs (
  job_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_prospecting_jobs_created ON prospecting_jobs(created_at);

-- Leasing pipeline boards (one per anonymous browser workspace)
CREATE TABLE IF NOT EXISTS pipeline_boards (
  workspace_id TEXT PRIMARY KEY,
  share_id TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_pipeline_boards_share ON pipeline_boards(share_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_boards_updated ON pipeline_boards(updated_at);

-- Store locations are served from static geotiles (apps/worker/public/tiles), not D1.
