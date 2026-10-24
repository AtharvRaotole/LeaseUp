import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AnalysisResponse } from '@leaseup/contracts';
import { watchlistRouter } from '../routes/watchlist';
import { createWatchlistTestDb, resetWatchlistTestDb } from './helpers/watchlist-test-db';

function minimalAnalysis(): AnalysisResponse {
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
      },
    ],
    dataQuality: 'high',
    warnings: [],
    runId: 'run-test',
    timestamp: '2026-10-23T12:00:00.000Z',
    mode: 'demo',
  };
}

const { workspaceIdFromRequest, analyzeMock } = vi.hoisted(() => ({
  workspaceIdFromRequest: vi.fn(),
  analyzeMock: vi.fn(),
}));

vi.mock('../lib/workspace-cookie', () => ({
  workspaceIdFromRequest: () => workspaceIdFromRequest(),
}));

vi.mock('../services/analysis', () => ({
  AnalysisService: vi.fn().mockImplementation(() => ({
    analyze: () => analyzeMock(),
  })),
}));

function appWithEnv(db: D1Database) {
  const app = new Hono();
  app.route('/api', watchlistRouter);
  return {
    fetch: (path: string, init?: RequestInit) =>
      app.fetch(
        new Request(`http://localhost${path}`, {
          ...init,
          headers: { 'Content-Type': 'application/json', ...init?.headers },
        }),
        { DB: db, APP_MODE: 'demo' } as import('../index').Env
      ),
  };
}

describe('watchlist routes', () => {
  beforeEach(() => {
    resetWatchlistTestDb();
    analyzeMock.mockReset();
    analyzeMock.mockImplementation(async () => minimalAnalysis());
    workspaceIdFromRequest.mockReset();
    workspaceIdFromRequest.mockImplementation(async () => 'ws-default');
  });

  it('does not list another visitor watched spaces', async () => {
    const db = createWatchlistTestDb();
    const app = appWithEnv(db);

    workspaceIdFromRequest.mockResolvedValue('ws-owner');
    const saveRes = await app.fetch('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({
        address: '1574 N Milwaukee Ave, Chicago, IL 60622',
        radiusKm: 10,
        analysis: minimalAnalysis(),
      }),
    });
    expect(saveRes.status).toBe(200);

    workspaceIdFromRequest.mockResolvedValue('ws-other');
    const listRes = await app.fetch('/api/watchlist');
    const listBody = (await listRes.json()) as { spaces: unknown[] };
    expect(listBody.spaces).toEqual([]);
  });

  it('returns 404 when another visitor requests a watch detail', async () => {
    const db = createWatchlistTestDb();
    const app = appWithEnv(db);

    workspaceIdFromRequest.mockResolvedValue('ws-owner');
    const saveRes = await app.fetch('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({
        address: '1574 N Milwaukee Ave, Chicago, IL 60622',
        radiusKm: 10,
        analysis: minimalAnalysis(),
      }),
    });
    const saved = (await saveRes.json()) as { watchId: string };

    workspaceIdFromRequest.mockResolvedValue('ws-other');
    const detailRes = await app.fetch(`/api/watchlist/${saved.watchId}`);
    expect(detailRes.status).toBe(404);
  });

  it('returns 429 on rapid recheck without running analyze again', async () => {
    const db = createWatchlistTestDb();
    const app = appWithEnv(db);

    workspaceIdFromRequest.mockResolvedValue('ws-1');
    const saveRes = await app.fetch('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({
        address: '1574 N Milwaukee Ave, Chicago, IL 60622',
        radiusKm: 10,
        analysis: minimalAnalysis(),
      }),
    });
    const saved = (await saveRes.json()) as { watchId: string };

    const first = await app.fetch(`/api/watchlist/${saved.watchId}/recheck`, { method: 'POST' });
    expect(first.status).toBe(200);
    expect(analyzeMock).toHaveBeenCalledTimes(1);

    const second = await app.fetch(`/api/watchlist/${saved.watchId}/recheck`, { method: 'POST' });
    expect(second.status).toBe(429);
    const body = (await second.json()) as { code: string };
    expect(body.code).toBe('RECHECK_COOLDOWN');
    expect(analyzeMock).toHaveBeenCalledTimes(1);
  });
});
