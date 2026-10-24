-- Watchlist rows are scoped by anonymous visitor id (leaseup_visitor_id cookie UUID in workspace_id).
CREATE INDEX IF NOT EXISTS idx_watch_spaces_workspace_updated
  ON watch_spaces(workspace_id, updated_at DESC);
