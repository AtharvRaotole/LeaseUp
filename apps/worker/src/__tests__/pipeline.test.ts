import { describe, it, expect, beforeEach } from 'vitest';
import { PipelineService } from '../services/pipeline';

const store = new Map<string, { shareId: string; payload: string }>();

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
          store.set(String(this.binds[0]), {
            shareId: String(this.binds[1]),
            payload: String(this.binds[2]),
          });
        }
        if (sql.includes('UPDATE pipeline_boards')) {
          const ws = String(this.binds[1]);
          const row = store.get(ws);
          if (row) row.payload = String(this.binds[0]);
        }
        return {};
      },
      async first() {
        if (sql.includes('workspace_id = ?')) {
          const row = store.get(String(this.binds[0]));
          return row ? { payload: row.payload } : null;
        }
        if (sql.includes('share_id = ?')) {
          for (const row of store.values()) {
            if (row.shareId === String(this.binds[0])) {
              return { payload: row.payload };
            }
          }
        }
        return null;
      },
    };
    return stmt;
  },
} as unknown as D1Database;

function demoEnv() {
  return { DB: db, CACHE: {} as KVNamespace, APP_MODE: 'demo' } as import('../index').Env;
}

describe('PipelineService', () => {
  beforeEach(() => store.clear());

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
    expect(board.cards[0]?.column).toBe('to_pitch');

    const csv = service.exportCsv(board);
    expect(csv).toContain('Vans');
    expect(csv).toContain('To pitch');
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
});
