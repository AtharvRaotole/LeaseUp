import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { PitchPackSnapshot } from '@leaseup/contracts';
import type { Env } from '../index';

const refreshState = vi.hoisted(() => ({ fail: false, calls: 0 }));

vi.mock('../lib/snapshot-nearest-refresh', () => ({
  refreshPitchPackNearestStores: async (_env: unknown, snapshot: unknown) => {
    refreshState.calls += 1;
    if (refreshState.fail) throw new Error('assets fetch failed');
    return snapshot;
  },
}));

const { pitchRouter } = await import('../routes/pitch');
const { rateLimiter } = await import('../middleware/rate-limit');

const PITCH_ID = '7255de71-5f7b-4ffe-8eed-08075d80ce22';

const stored: PitchPackSnapshot = {
  id: PITCH_ID,
  createdAt: '2026-10-20T00:00:00.000Z',
  address: '1560 N Milwaukee Ave, Chicago, IL 60622',
  location: {
    address: '1560 N Milwaukee Ave, Chicago, IL 60622',
    latitude: 41.9097,
    longitude: -87.6768,
  },
  radiusKm: 10,
  analysisTimestamp: '2026-10-20T00:00:00.000Z',
  runId: 'run-1',
  prospects: [
    {
      prospect: {
        brand: {
          entityId: 'ent-1',
          name: 'Warby Parker',
          affinity: 0.9,
          affinityRank: 1,
          verified: 'verified (2 sources)',
        },
        outreachDraft: '',
        reasons: [],
        nearestExistingStoreKm: 4.2,
      },
      whyLine: 'Why',
    },
  ],
};

function dbReturning(first: () => Promise<unknown>): D1Database {
  return {
    prepare: () => ({ bind: () => ({ first }) }),
  } as unknown as D1Database;
}

function app(db: D1Database) {
  const a = new Hono<{ Bindings: Env }>();
  a.route('/api', pitchRouter);
  const fetchPath = (path: string) =>
    a.fetch(new Request(`https://w.dev${path}`), { DB: db, APP_MODE: 'live' } as Env);
  return { fetch: fetchPath };
}

describe('GET /api/pitch/:id resilience', () => {
  beforeEach(() => {
    refreshState.fail = false;
    refreshState.calls = 0;
  });

  it('serves the stored snapshot when nearest-store refresh on read throws', async () => {
    refreshState.fail = true;
    const res = await app(dbReturning(async () => ({ payload: JSON.stringify(stored) }))).fetch(
      `/api/pitch/${PITCH_ID}`
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as PitchPackSnapshot;
    expect(body.id).toBe(PITCH_ID);
    expect(body.prospects[0]!.prospect.nearestExistingStoreKm).toBe(4.2);
    expect(body.storeDistancesSnapshotOnly).toBe(true);
    expect(body.storeDistanceDataAsOf).toBe(stored.analysisTimestamp);
    expect(refreshState.calls).toBe(1);
  });

  it('returns a retryable 503 (not a 500) when the D1 read fails', async () => {
    const res = await app(
      dbReturning(async () => {
        throw new Error('D1_ERROR: Network connection lost.');
      })
    ).fetch(`/api/pitch/${PITCH_ID}`);
    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('2');
    expect(((await res.json()) as { code: string }).code).toBe('PITCH_TEMPORARILY_UNAVAILABLE');
  });

  it('still 404s a missing pitch', async () => {
    const res = await app(dbReturning(async () => null)).fetch('/api/pitch/missing');
    expect(res.status).toBe(404);
  });
});

describe('rateLimiter fail-open', () => {
  it('lets the request through when the D1 limiter read fails', async () => {
    const a = new Hono<{ Bindings: Env }>();
    a.use('*', rateLimiter({ windowMs: 60_000, maxRequests: 5, keyPrefix: 't' }));
    a.get('/ok', (c) => c.json({ ok: true }));
    const db = dbReturning(async () => {
      throw new Error('D1_ERROR: overloaded');
    });
    const res = await a.fetch(new Request('https://w.dev/ok'), { DB: db } as Env);
    expect(res.status).toBe(200);
  });
});
