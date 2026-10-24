import { describe, expect, it } from 'vitest';
import { applyWatchTradeAreaAlerts } from '../lib/pipeline-watch-alerts';

describe('applyWatchTradeAreaAlerts', () => {
  it('flags pipeline cards when a watched brand drops from top 10', async () => {
    const updates: Array<{ entityId: string; alert: string }> = [];
    const db = {
      prepare: (sql: string) => ({
        binds: [] as unknown[],
        bind(...args: unknown[]) {
          this.binds = args;
          return this;
        },
        async run() {
          if (sql.includes('UPDATE pipeline_cards')) {
            updates.push({
              entityId: String(this.binds[3]),
              alert: String(this.binds[0]),
            });
          }
          return { meta: { changes: 1 } };
        },
      }),
    } as unknown as D1Database;

    const count = await applyWatchTradeAreaAlerts(
      db,
      'ws-1',
      'watch-1',
      '1574 N Milwaukee Ave, Chicago, IL',
      {
        kind: 'changes',
        newlyOpenedStore: [],
        newInTop10: [],
        droppedFromTop10: [
          {
            entityId: 'brand-a',
            name: 'Test Brand',
            affinityRank: 3,
          },
        ],
      },
      10
    );

    expect(count).toBe(1);
    expect(updates[0]?.alert).toContain('dropped from your top pitch list');
  });
});
