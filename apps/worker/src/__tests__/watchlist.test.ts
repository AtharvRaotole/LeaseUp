import { describe, expect, it, beforeEach } from 'vitest';
import { WatchlistService } from '../services/watchlist';
import { RecheckCooldownError } from '../lib/watch-recheck-cooldown';
import type { AnalysisResponse } from '@leaseup/contracts';

const watchStore = new Map<string, Record<string, unknown>>();
const snapshotStore = new Map<string, { payload: string; created_at: number }[]>();
const rateLimitStore = new Map<string, { window_start: number }>();

function resetStores() {
  watchStore.clear();
  snapshotStore.clear();
  rateLimitStore.clear();
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
        if (sql.includes('INSERT INTO watch_spaces')) {
          const [watchId, workspaceId, address, addressKey, radiusKm, created, updated] = this.binds as [
            string,
            string,
            string,
            string,
            number,
            number,
            number,
          ];
          watchStore.set(watchId, {
            watch_id: watchId,
            workspace_id: workspaceId,
            address,
            address_key: addressKey,
            radius_km: radiusKm,
            created_at: created,
            updated_at: updated,
          });
        }
        if (sql.includes('INSERT INTO watch_snapshots')) {
          const [, watchId, payload] = this.binds as [string, string, string];
          const list = snapshotStore.get(watchId) ?? [];
          list.push({ payload, created_at: list.length + 1 });
          snapshotStore.set(watchId, list);
        }
        if (sql.includes('UPDATE watch_spaces SET updated_at')) {
          const [updated, watchId] = this.binds as [number, string];
          const row = watchStore.get(watchId);
          if (row) row.updated_at = updated;
        }
        if (sql.includes('UPDATE pipeline_cards')) {
          return { meta: { changes: 0 } };
        }
        if (sql.includes('INSERT INTO rate_limits')) {
          const id = String(this.binds[0]);
          const windowStart = Number(this.binds[1]);
          rateLimitStore.set(id, { window_start: windowStart });
        }
        return {};
      },
      async first() {
        if (sql.includes('SELECT window_start FROM rate_limits')) {
          const row = rateLimitStore.get(String(this.binds[0]));
          return row ? { window_start: row.window_start } : null;
        }
        if (sql.includes('FROM watch_spaces WHERE watch_id = ? AND workspace_id')) {
          const [watchId, workspaceId] = this.binds as [string, string];
          for (const row of watchStore.values()) {
            if (row.watch_id === watchId && row.workspace_id === workspaceId) return row;
          }
          return null;
        }
        if (sql.includes('FROM watch_spaces') && sql.includes('address_key')) {
          const [workspaceId, addressKey, radiusKm] = this.binds as [string, string, number];
          for (const row of watchStore.values()) {
            if (
              row.workspace_id === workspaceId &&
              row.address_key === addressKey &&
              row.radius_km === radiusKm
            ) {
              return { watch_id: row.watch_id };
            }
          }
          return null;
        }
        if (sql.includes('COUNT(*) AS c FROM watch_snapshots')) {
          const watchId = String(this.binds[0]);
          return { c: snapshotStore.get(watchId)?.length ?? 0 };
        }
        return null;
      },
      async all() {
        if (sql.includes('FROM watch_spaces w') && sql.includes('workspace_id')) {
          const workspaceId = String(this.binds[0]);
          const rows = [...watchStore.values()].filter((r) => r.workspace_id === workspaceId);
          return {
            results: rows.map((r) => ({
              watch_id: r.watch_id,
              address: r.address,
              radius_km: r.radius_km,
              created_at: r.created_at,
              updated_at: r.updated_at,
              snapshot_count: snapshotStore.get(r.watch_id as string)?.length ?? 0,
            })),
          };
        }
        if (sql.includes('FROM watch_snapshots')) {
          const [watchId, limit] = this.binds as [string, number];
          const list = [...(snapshotStore.get(watchId) ?? [])].sort(
            (a, b) => b.created_at - a.created_at
          );
          return { results: list.slice(0, limit).map((s) => ({ payload: s.payload })) };
        }
        return { results: [] };
      },
    };
    return stmt;
  },
} as unknown as D1Database;

function minimalAnalysis(nearestKm?: number): AnalysisResponse {
  return {
    location: { address: '1574 N Milwaukee Ave, Chicago, IL 60622', latitude: 41.9, longitude: -87.7 },
    backtest: { totalStores: 1, predictedStores: 1, accuracy: 1, precisionAt10: 1, examples: [] },
    prospects: [
      {
        brand: {
          entityId: 'ent-same',
          name: 'Same Brand',
          affinity: 0.9,
          affinityRank: 1,
          verified: 'verified (2 sources)',
        },
        outreachDraft: 'Hi',
        reasons: [],
        nearestExistingStoreKm: nearestKm,
      },
    ],
    dataQuality: 'high',
    warnings: [],
    runId: 'run-test',
    timestamp: '2026-10-23T12:00:00.000Z',
    mode: 'demo',
  };
}

describe('WatchlistService', () => {
  beforeEach(() => resetStores());

  it('saves first snapshot and reports first_check', async () => {
    const service = new WatchlistService({ DB: db } as import('../index').Env);
    const detail = await service.saveFromReport(
      'ws-1',
      '1574 N Milwaukee Ave, Chicago, IL 60622',
      10,
      minimalAnalysis(undefined)
    );
    expect(detail.diff?.kind).toBe('first_check');
    expect(detail.snapshotCount).toBe(1);
  });

  it('diffs two recheck snapshots in D1', async () => {
    const service = new WatchlistService({ DB: db } as import('../index').Env);
    const first = await service.saveFromReport(
      'ws-1',
      '1574 N Milwaukee Ave, Chicago, IL 60622',
      10,
      minimalAnalysis(undefined)
    );
    const second = await service.recheck(first.watchId, 'ws-1', minimalAnalysis(2));
    expect(second?.diff?.kind).toBe('changes');
    expect(second?.diff?.newlyOpenedStore).toHaveLength(1);
  });

  it('does not expose watches across workspaces', async () => {
    const service = new WatchlistService({ DB: db } as import('../index').Env);
    const detail = await service.saveFromReport(
      'ws-a',
      '1574 N Milwaukee Ave, Chicago, IL 60622',
      10,
      minimalAnalysis(undefined)
    );
    const other = await service.getDetail(detail.watchId, 'ws-b');
    expect(other).toBeNull();
  });

  it('lists watches only for the requesting workspace', async () => {
    const service = new WatchlistService({ DB: db } as import('../index').Env);
    await service.saveFromReport(
      'ws-a',
      '1574 N Milwaukee Ave, Chicago, IL 60622',
      10,
      minimalAnalysis(undefined)
    );
    await service.saveFromReport(
      'ws-b',
      '500 W Madison St, Chicago, IL 60661',
      5,
      minimalAnalysis(undefined)
    );
    const listA = await service.list('ws-a');
    const listB = await service.list('ws-b');
    expect(listA).toHaveLength(1);
    expect(listB).toHaveLength(1);
    expect(listA[0]?.address).toContain('Milwaukee');
    expect(listB[0]?.address).toContain('Madison');
  });

  it('enforces recheck cooldown before analyze', async () => {
    const service = new WatchlistService({ DB: db } as import('../index').Env);
    const detail = await service.saveFromReport(
      'ws-1',
      '1574 N Milwaukee Ave, Chicago, IL 60622',
      10,
      minimalAnalysis(undefined)
    );
    await service.recheck(detail.watchId, 'ws-1', minimalAnalysis(2));
    await expect(
      service.assertRecheckAllowedForWatchAsync(detail.watchId, 'ws-1')
    ).rejects.toBeInstanceOf(RecheckCooldownError);
  });
});
