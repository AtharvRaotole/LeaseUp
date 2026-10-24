-- Report + watchlist loop: evidence snapshot, watch link, trade area alerts (additive)
ALTER TABLE pipeline_cards ADD COLUMN evidence_snapshot_json TEXT;
ALTER TABLE pipeline_cards ADD COLUMN watch_id TEXT;
ALTER TABLE pipeline_cards ADD COLUMN trade_area_alert TEXT;

CREATE INDEX IF NOT EXISTS idx_pipeline_cards_watch ON pipeline_cards(workspace_id, watch_id);
