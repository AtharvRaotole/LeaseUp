import type {
  PipelineCard,
  PipelineOutreachContext,
  PipelineOutreachDraft,
  PipelineProspectStatus,
} from '@leaseup/contracts';
import { normalizePipelineCard } from './pipeline-legacy';

type CardRow = {
  card_id: string;
  workspace_id: string;
  prospect_status: string;
  sort_order: number;
  brand_entity_id: string;
  brand_name: string;
  property_address: string;
  property_neighborhood: string | null;
  affinity_rank: number;
  verification: string;
  pitch_id: string | null;
  pitch_link: string | null;
  report_path: string | null;
  notes: string;
  recipient_email: string | null;
  last_touched_at: number;
  next_step_reminder_at: number | null;
  outreach_draft_json: string | null;
  outreach_context_json: string | null;
};

function isoFromUnix(sec: number): string {
  return new Date(sec * 1000).toISOString();
}

function unixFromIso(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function rowToCard(row: CardRow): PipelineCard {
  return normalizePipelineCard({
    id: row.card_id,
    prospectStatus: row.prospect_status as PipelineProspectStatus,
    sortOrder: row.sort_order,
    brandEntityId: row.brand_entity_id,
    brandName: row.brand_name,
    propertyAddress: row.property_address,
    propertyNeighborhood: row.property_neighborhood ?? undefined,
    affinityRank: row.affinity_rank,
    verification: row.verification,
    pitchId: row.pitch_id ?? undefined,
    pitchLink: row.pitch_link ?? undefined,
    reportPath: row.report_path ?? undefined,
    notes: row.notes,
    recipientEmail: row.recipient_email ?? undefined,
    lastTouchedAt: isoFromUnix(row.last_touched_at),
    followUpAt: row.next_step_reminder_at
      ? isoFromUnix(row.next_step_reminder_at)
      : undefined,
    outreachDraft: row.outreach_draft_json
      ? (JSON.parse(row.outreach_draft_json) as PipelineOutreachDraft)
      : undefined,
    outreachContext: row.outreach_context_json
      ? (JSON.parse(row.outreach_context_json) as PipelineOutreachContext)
      : undefined,
  });
}

export async function listPipelineCards(
  db: D1Database,
  workspaceId: string
): Promise<PipelineCard[]> {
  const result = await db
    .prepare(
      `SELECT card_id, workspace_id, prospect_status, sort_order, brand_entity_id, brand_name,
              property_address, property_neighborhood, affinity_rank, verification,
              pitch_id, pitch_link, report_path, notes, recipient_email, last_touched_at,
              next_step_reminder_at, outreach_draft_json, outreach_context_json
       FROM pipeline_cards WHERE workspace_id = ? ORDER BY prospect_status, sort_order`
    )
    .bind(workspaceId)
    .all<CardRow>();
  return (result.results ?? []).map(rowToCard);
}

export async function insertPipelineCard(
  db: D1Database,
  workspaceId: string,
  card: PipelineCard
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO pipeline_cards (
        card_id, workspace_id, prospect_status, sort_order, brand_entity_id, brand_name,
        property_address, property_neighborhood, affinity_rank, verification,
        pitch_id, pitch_link, report_path, notes, recipient_email, last_touched_at,
        next_step_reminder_at, outreach_draft_json, outreach_context_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      card.id,
      workspaceId,
      card.prospectStatus,
      card.sortOrder,
      card.brandEntityId,
      card.brandName,
      card.propertyAddress,
      card.propertyNeighborhood ?? null,
      card.affinityRank,
      card.verification,
      card.pitchId ?? null,
      card.pitchLink ?? null,
      card.reportPath ?? null,
      card.notes,
      card.recipientEmail ?? null,
      unixFromIso(card.lastTouchedAt),
      card.followUpAt ? unixFromIso(card.followUpAt) : null,
      card.outreachDraft ? JSON.stringify(card.outreachDraft) : null,
      card.outreachContext ? JSON.stringify(card.outreachContext) : null
    )
    .run();
}

export async function updatePipelineCardRow(
  db: D1Database,
  workspaceId: string,
  card: PipelineCard
): Promise<void> {
  await db
    .prepare(
      `UPDATE pipeline_cards SET
        prospect_status = ?, sort_order = ?, notes = ?, recipient_email = ?,
        last_touched_at = ?, next_step_reminder_at = ?,
        outreach_draft_json = ?, outreach_context_json = ?
       WHERE card_id = ? AND workspace_id = ?`
    )
    .bind(
      card.prospectStatus,
      card.sortOrder,
      card.notes,
      card.recipientEmail ?? null,
      unixFromIso(card.lastTouchedAt),
      card.followUpAt ? unixFromIso(card.followUpAt) : null,
      card.outreachDraft ? JSON.stringify(card.outreachDraft) : null,
      card.outreachContext ? JSON.stringify(card.outreachContext) : null,
      card.id,
      workspaceId
    )
    .run();
}

export async function migrateLegacyCardsToTable(
  db: D1Database,
  workspaceId: string,
  legacyCards: PipelineCard[]
): Promise<void> {
  for (const raw of legacyCards) {
    const card = normalizePipelineCard(raw);
    await insertPipelineCard(db, workspaceId, card);
  }
}
