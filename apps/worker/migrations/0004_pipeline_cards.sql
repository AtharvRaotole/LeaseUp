-- Broker CRM: per-workspace pipeline cards (D1 only, no KV per edit)
CREATE TABLE IF NOT EXISTS pipeline_cards (
  card_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  prospect_status TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  brand_entity_id TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  property_address TEXT NOT NULL,
  property_neighborhood TEXT,
  affinity_rank INTEGER NOT NULL,
  verification TEXT NOT NULL,
  pitch_id TEXT,
  pitch_link TEXT,
  report_path TEXT,
  notes TEXT NOT NULL DEFAULT '',
  recipient_email TEXT,
  last_touched_at INTEGER NOT NULL,
  next_step_reminder_at INTEGER,
  outreach_draft_json TEXT,
  outreach_context_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_pipeline_cards_workspace ON pipeline_cards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_workspace_status ON pipeline_cards(workspace_id, prospect_status);
