import { describe, it, expect, beforeEach } from 'vitest';
import { PipelineService } from '../services/pipeline';

const boardStore = new Map<string, { shareId: string; payload: string }>();
const cardStore = new Map<string, Map<string, Record<string, unknown>>>();

function cardsForWorkspace(ws: string) {
  if (!cardStore.has(ws)) cardStore.set(ws, new Map());
  return cardStore.get(ws)!;
}

const db = {
  prepare: (sql: string) => {
    const stmt = {
      binds: [] as unknown[],
      bind(...args: unknown[]) {
        this.binds = args;
        return this;
      },
      async run() {
        if (sql.includes('INSERT INTO pipeline_boards')) {
          boardStore.set(String(this.binds[0]), {
            shareId: String(this.binds[1]),
            payload: String(this.binds[2]),
          });
        }
        if (sql.includes('UPDATE pipeline_boards')) {
          const ws = String(this.binds[1]);
          const row = boardStore.get(ws);
          if (row) row.payload = String(this.binds[0]);
        }
        if (sql.includes('INSERT INTO pipeline_cards')) {
          const ws = String(this.binds[1]);
          const cardId = String(this.binds[0]);
          cardsForWorkspace(ws).set(cardId, {
            card_id: cardId,
            workspace_id: ws,
            prospect_status: String(this.binds[2]),
            sort_order: Number(this.binds[3]),
            brand_entity_id: String(this.binds[4]),
            brand_name: String(this.binds[5]),
            property_address: String(this.binds[6]),
            property_neighborhood: this.binds[7],
            affinity_rank: Number(this.binds[8]),
            verification: String(this.binds[9]),
            pitch_id: this.binds[10],
            pitch_link: this.binds[11],
            report_path: this.binds[12],
            notes: String(this.binds[13]),
            recipient_email: this.binds[14],
            last_touched_at: Number(this.binds[15]),
            next_step_reminder_at: this.binds[16],
            outreach_draft_json: this.binds[17],
            outreach_context_json: this.binds[18],
          });
        }
        if (sql.includes('UPDATE pipeline_cards SET')) {
          const cardId = String(this.binds[7]);
          const ws = String(this.binds[8]);
          const row = cardsForWorkspace(ws).get(cardId);
          if (row) {
            row.prospect_status = String(this.binds[0]);
            row.sort_order = Number(this.binds[1]);
            row.notes = String(this.binds[2]);
            row.recipient_email = this.binds[3];
            row.last_touched_at = Number(this.binds[4]);
            row.next_step_reminder_at = this.binds[5];
            row.outreach_draft_json = this.binds[6];
          }
        }
        return {};
      },
      async first() {
        if (sql.includes('workspace_id = ?') && sql.includes('pipeline_boards')) {
          const row = boardStore.get(String(this.binds[0]));
          return row ? { payload: row.payload } : null;
        }
        if (sql.includes('share_id = ?')) {
          for (const row of boardStore.values()) {
            if (row.shareId === String(this.binds[0])) {
              return { payload: row.payload };
            }
          }
        }
        return null;
      },
      async all() {
        if (sql.includes('FROM pipeline_cards')) {
          const ws = String(this.binds[0]);
          const rows = [...cardsForWorkspace(ws).values()];
          return { results: rows };
        }
        return { results: [] };
      },
    };
    return stmt;
  },
} as unknown as D1Database;

function demoEnv() {
  return { DB: db, CACHE: {} as KVNamespace, APP_MODE: 'demo' } as import('../index').Env;
}

describe('PipelineService', () => {
  beforeEach(() => {
    boardStore.clear();
    cardStore.clear();
  });

  it('adds a card and exports CSV', async () => {
    const service = new PipelineService(demoEnv());
    const ws = '00000000-0000-4000-8000-000000000001';
    await service.getOrCreate(ws);
    const board = await service.addCard(ws, {
      brandEntityId: 'brand-1',
      brandName: 'Vans',
      propertyAddress: '1574 N Milwaukee Ave, Chicago, IL',
      affinityRank: 13,
      verification: '2 sources',
      outreachContext: { reasons: ['Ranked #13 for local taste'] },
    });
    expect(board.cards).toHaveLength(1);
    expect(board.cards[0]?.prospectStatus).toBe('to_pitch');

    const csv = service.exportCsv(board);
    expect(csv).toContain('Vans');
    expect(csv).toContain('To pitch');
  });

  it('updates CRM fields on a card', async () => {
    const service = new PipelineService(demoEnv());
    const ws = '00000000-0000-4000-8000-000000000003';
    const board = await service.addCard(ws, {
      brandEntityId: 'b',
      brandName: 'Nike',
      propertyAddress: '1 Main St',
      affinityRank: 1,
      verification: '1 source',
      outreachContext: { reasons: [] },
    });
    const cardId = board.cards[0]!.id;
    const updated = await service.updateCard(ws, cardId, {
      prospectStatus: 'sent_by_me',
      notes: 'Left voicemail',
      followUpAt: '2030-01-15T12:00:00.000Z',
    });
    expect(updated.cards[0]?.prospectStatus).toBe('sent_by_me');
    expect(updated.cards[0]?.notes).toBe('Left voicemail');
    expect(updated.cards[0]?.followUpAt).toContain('2030-01-15');
  });

  it('strips outreach from public board', async () => {
    const service = new PipelineService(demoEnv());
    const ws = '00000000-0000-4000-8000-000000000002';
    const board = await service.addCard(ws, {
      brandEntityId: 'b',
      brandName: 'Nike',
      propertyAddress: '1 Main St',
      affinityRank: 1,
      verification: '1 source',
      outreachContext: { reasons: [] },
    });
    const cardId = board.cards[0]!.id;
    await service.updateCard(ws, cardId, {
      recipientEmail: 'user@example.com',
      outreachDraft: { subject: 'Hi', body: 'Body' },
    });

    const full = await service.getByWorkspace(ws);
    const pub = await service.getPublic(full!.shareId);
    expect(pub?.cards[0]?.recipientEmail).toBeUndefined();
    expect(pub?.cards[0]?.outreachDraft).toBeUndefined();
  });

  it('does not share cards across workspaces', async () => {
    const service = new PipelineService(demoEnv());
    const wsA = '00000000-0000-4000-8000-000000000010';
    const wsB = '00000000-0000-4000-8000-000000000011';
    await service.addCard(wsA, {
      brandEntityId: 'x',
      brandName: 'Only A',
      propertyAddress: 'A st',
      affinityRank: 1,
      verification: 'ok',
      outreachContext: { reasons: [] },
    });
    const boardB = await service.getOrCreate(wsB);
    expect(boardB.cards).toHaveLength(0);
    const boardA = await service.getByWorkspace(wsA);
    expect(boardA?.cards).toHaveLength(1);
  });
});
