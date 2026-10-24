import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../og/satori-share-card', () => ({
  renderReportSharePng: vi.fn(async () => new Uint8Array([137, 80, 78, 71])),
  renderPitchSharePng: vi.fn(async () => new Uint8Array([137, 80, 78, 71])),
}));
import { AnalysisService } from '../services/analysis';
import { PitchService } from '../services/pitch';
import { PortfolioService } from '../services/portfolio';
import { ProspectingService } from '../services/prospecting';
import { PipelineService } from '../services/pipeline';
import { WatchlistService } from '../services/watchlist';
import { OwnerUpdateShareService } from '../services/owner-update-share';
import { OgImageService } from '../services/og-image';
import { GeocodeService } from '../services/geocode';
import { getResponseCache } from '../lib/worker-cache';
import { rateLimiter } from '../middleware/rate-limit';
import { buildOwnerUpdateSnapshot } from '../lib/owner-update';
import { reportShareMetaFromRequest } from '../lib/share-preview';
import {
  HEAVY_DEMO_TRAFFIC,
  KV_DAILY_WRITE_CEILING,
  KV_ROUTE_BUDGET,
  projectedDailyKvWrites,
} from '../lib/kv-route-budget';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import type { AnalysisResponse, PipelineBoard } from '@leaseup/contracts';
import {
  assertKvWithinBudget,
  createCountingKvNamespace,
  installWorkersCacheApiStub,
} from './helpers/kv-counting';

function minimalResults(): AnalysisResponse {
  return {
    location: {
      address: DEMO_CHIP_ADDRESSES.wicker,
      latitude: 41.9088,
      longitude: -87.6776,
      neighborhood: 'Wicker Park',
    },
    backtest: {
      totalStores: 10,
      predictedStores: 5,
      accuracy: 0.5,
      precisionAt10: 0.5,
      examples: [],
    },
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
    timestamp: '2026-01-01T00:00:00.000Z',
    mode: 'demo',
  };
}

function noopDb(run = vi.fn().mockResolvedValue({})) {
  return {
    prepare: () => {
      const stmt = { bind: () => stmt, run, first: async () => null };
      return stmt;
    },
  } as unknown as D1Database;
}

function demoEnv(kv: ReturnType<typeof createCountingKvNamespace>, db: D1Database) {
  return { DB: db, CACHE: kv.CACHE, APP_MODE: 'demo' } as import('../index').Env;
}

describe('KV route budgets (integration build, fixture-backed)', () => {
  beforeEach(() => {
    installWorkersCacheApiStub();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('projected heavy demo day stays under KV write ceiling', () => {
    const projected = projectedDailyKvWrites(HEAVY_DEMO_TRAFFIC);
    expect(projected.puts).toBeLessThanOrEqual(KV_DAILY_WRITE_CEILING);
    expect(projected.puts).toBe(
      HEAVY_DEMO_TRAFFIC.watchRechecks * KV_ROUTE_BUDGET.watchlistRecheck.puts
    );
  });

  it('POST /api/analyze cold and warm', async () => {
    const kv = createCountingKvNamespace();
    const env = demoEnv(kv, noopDb());
    const service = new AnalysisService(env);
    const req = { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 };

    await service.analyze(req, 'run-cold', 'ip');
    const coldGets = kv.gets.length;
    const coldPuts = kv.puts.length;
    assertKvWithinBudget('analyze cold', KV_ROUTE_BUDGET.analyzeCold, kv.gets, kv.puts);

    await service.analyze(req, 'run-warm', 'ip');
    const warmGets = kv.gets.length - coldGets;
    const warmPuts = kv.puts.length - coldPuts;
    expect({ gets: warmGets, puts: warmPuts }).toEqual(KV_ROUTE_BUDGET.analyzeWarm);
  });

  it('POST /api/geocode (demo preview)', async () => {
    const kv = createCountingKvNamespace();
    const service = new GeocodeService(getResponseCache(), 'LeaseUp-Test/1.0', 'demo');
    await service.preview(DEMO_CHIP_ADDRESSES.wicker);
    assertKvWithinBudget('geocode preview', KV_ROUTE_BUDGET.geocodePreview, kv.gets, kv.puts);
  });

  it('POST /api/pitch', async () => {
    const kv = createCountingKvNamespace();
    const env = demoEnv(kv, noopDb());
    await new PitchService(env).create({ radiusKm: 10, results: minimalResults() });
    assertKvWithinBudget('pitch create', KV_ROUTE_BUDGET.pitchCreate, kv.gets, kv.puts);
  });

  it('POST /api/portfolio', async () => {
    const kv = createCountingKvNamespace();
    const env = demoEnv(kv, noopDb());
    await new PortfolioService(env).create({ addresses: [DEMO_CHIP_ADDRESSES.boulder] });
    assertKvWithinBudget('portfolio create', KV_ROUTE_BUDGET.portfolioCreate, kv.gets, kv.puts);
  });

  it('POST /api/prospecting', async () => {
    const kv = createCountingKvNamespace();
    const jobStore = new Map<string, string>();
    const db = {
      prepare: (sql: string) => {
        const stmt = {
          binds: [] as unknown[],
          bind(...args: unknown[]) {
            this.binds = args;
            return this;
          },
          async run() {
            if (sql.includes('prospecting_jobs')) {
              jobStore.set(String(this.binds[0]), String(this.binds[1]));
            }
            return {};
          },
          async first() {
            if (sql.includes('SELECT payload FROM prospecting_jobs')) {
              const payload = jobStore.get(String(this.binds[0]));
              return payload ? { payload } : null;
            }
            return null;
          },
        };
        return stmt;
      },
    } as unknown as D1Database;
    const env = demoEnv(kv, db);
    await new ProspectingService(env).create({
      address: DEMO_CHIP_ADDRESSES.boulder,
      radius: 10,
    });
    assertKvWithinBudget('prospecting create', KV_ROUTE_BUDGET.prospectingCreate, kv.gets, kv.puts);
  });

  it('pipeline board bootstrap', async () => {
    const kv = createCountingKvNamespace();
    const env = demoEnv(kv, noopDb());
    await new PipelineService(env).getOrCreate('00000000-0000-4000-8000-000000000001');
    assertKvWithinBudget('pipeline board', KV_ROUTE_BUDGET.pipelineBoardCreate, kv.gets, kv.puts);
  });

  it('watchlist save uses no KV; HTTP recheck uses one get and one put', async () => {
    const kv = createCountingKvNamespace();
    const env = demoEnv(kv, watchlistTestDb());
    const service = new WatchlistService(env);
    const detail = await service.saveFromReport(
      'ws-1',
      DEMO_CHIP_ADDRESSES.wicker,
      10,
      minimalResults()
    );
    assertKvWithinBudget('watchlist save', KV_ROUTE_BUDGET.watchlistSave, kv.gets, kv.puts);

    const saveGets = kv.gets.length;
    const savePuts = kv.puts.length;
    await service.recheck(detail.watchId, 'ws-1', minimalResults());
    const recheckGets = kv.gets.length - saveGets;
    const recheckPuts = kv.puts.length - savePuts;
    expect({ gets: recheckGets, puts: recheckPuts }).toEqual({ gets: 0, puts: 0 });

    const { recordVisitorRecheckKv, assertVisitorRecheckKvAllowed } = await import(
      '../lib/watch-recheck-kv-limit'
    );
    const beforeGets = kv.gets.length;
    const beforePuts = kv.puts.length;
    const now = Date.UTC(2026, 9, 24, 12, 0, 0);
    await assertVisitorRecheckKvAllowed(kv.CACHE, 'visitor-budget', now);
    await recordVisitorRecheckKv(kv.CACHE, 'visitor-budget', now);
    expect({ gets: kv.gets.length - beforeGets, puts: kv.puts.length - beforePuts }).toEqual(
      KV_ROUTE_BUDGET.watchlistRecheck
    );
  });

  it('owner update share + load', async () => {
    const kv = createCountingKvNamespace();
    const store = new Map<string, string>();
    const db = {
      prepare: (sql: string) => {
        const stmt = {
          binds: [] as unknown[],
          bind(...args: unknown[]) {
            this.binds = args;
            return this;
          },
          async run() {
            if (sql.includes('INSERT INTO owner_updates')) {
              store.set(String(this.binds[0]), String(this.binds[1]));
            }
          },
          async first() {
            if (sql.includes('owner_updates')) {
              const payload = store.get(String(this.binds[0]));
              return payload ? { payload } : null;
            }
            return null;
          },
        };
        return stmt;
      },
    } as unknown as D1Database;
    const board: PipelineBoard = {
      workspaceId: 'ws-1',
      shareId: 'share-1',
      createdAt: '2026-10-23T00:00:00.000Z',
      updatedAt: '2026-10-23T12:00:00.000Z',
      cards: [],
    };
    const env = demoEnv(kv, db);
    const service = new OwnerUpdateShareService(env);
    const snapshot = buildOwnerUpdateSnapshot(board, DEMO_CHIP_ADDRESSES.wicker);
    await service.save(snapshot);
    assertKvWithinBudget('owner update share', KV_ROUTE_BUDGET.ownerUpdateShare, kv.gets, kv.puts);
    const shareGets = kv.gets.length;
    const sharePuts = kv.puts.length;
    await service.get(snapshot.id);
    expect({ gets: kv.gets.length - shareGets, puts: kv.puts.length - sharePuts }).toEqual(
      KV_ROUTE_BUDGET.ownerUpdateGet
    );
  });

  it('GET /api/share/report meta (no worker KV binding)', () => {
    const kv = createCountingKvNamespace();
    reportShareMetaFromRequest(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      '/r/demo'
    );
    assertKvWithinBudget('share report meta', KV_ROUTE_BUDGET.shareReportMeta, kv.gets, kv.puts);
  });

  it('GET /api/og/report.png cold then warm', async () => {
    const kv = createCountingKvNamespace();
    const env = demoEnv(kv, noopDb());
    const svc = new OgImageService(env);
    const req = { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 };
    await svc.getReportPng(req);
    assertKvWithinBudget('og report cold', KV_ROUTE_BUDGET.ogReportPngCold, kv.gets, kv.puts);
    const coldGets = kv.gets.length;
    const coldPuts = kv.puts.length;
    await svc.getReportPng(req);
    expect({ gets: kv.gets.length - coldGets, puts: kv.puts.length - coldPuts }).toEqual(
      KV_ROUTE_BUDGET.ogReportPngWarm
    );
  });

  it('GET /api/og/pitch/:id.png (D1 pitch + Cache API PNG)', async () => {
    const kv = createCountingKvNamespace();
    const pitchStore = new Map<string, string>();
    const db = {
      prepare: (sql: string) => {
        const stmt = {
          binds: [] as unknown[],
          bind(...args: unknown[]) {
            this.binds = args;
            return this;
          },
          async run() {
            if (sql.includes('INSERT INTO pitch_packs')) {
              pitchStore.set(String(this.binds[0]), String(this.binds[1]));
            }
          },
          async first() {
            if (sql.includes('pitch_packs')) {
              const payload = pitchStore.get(String(this.binds[0]));
              return payload ? { payload } : null;
            }
            return null;
          },
        };
        return stmt;
      },
    } as unknown as D1Database;
    const env = demoEnv(kv, db);
    const created = await new PitchService(env).create({ radiusKm: 10, results: minimalResults() });
    const pitchGets = kv.gets.length;
    const pitchPuts = kv.puts.length;
    await new OgImageService(env).getPitchPng(created.id);
    assertKvWithinBudget(
      'og pitch png',
      KV_ROUTE_BUDGET.ogPitchPngCold,
      kv.gets.slice(pitchGets),
      kv.puts.slice(pitchPuts)
    );
  });

  it('rate limit middleware uses D1 only (0 KV)', async () => {
    const kv = createCountingKvNamespace();
    const rows = new Map<string, { count: number }>();
    const db = {
      prepare: () => {
        const stmt = {
          _bind: [] as unknown[],
          bind(...args: unknown[]) {
            this._bind = args;
            return this;
          },
          async first() {
            const id = this._bind[0] as string;
            const row = rows.get(id);
            return row ? { count: row.count } : null;
          },
          async run() {
            const [id, count] = this._bind as [string, number];
            rows.set(id, { count });
          },
        };
        return stmt;
      },
    } as unknown as D1Database;

    const middleware = rateLimiter({ windowMs: 60_000, maxRequests: 5, keyPrefix: 'analyze' });
    const next = vi.fn();
    const ctx = {
      req: { header: () => '203.0.113.9' },
      env: { DB: db, CACHE: kv.CACHE },
      header: vi.fn(),
      json: vi.fn(),
    };
    await middleware(ctx as never, next);
    assertKvWithinBudget('rate limit', KV_ROUTE_BUDGET.rateLimitWindow, kv.gets, kv.puts);
    expect(next).toHaveBeenCalled();
  });
});

/** Minimal D1 mock copied from watchlist.test.ts (watch + snapshot tables). */
function watchlistTestDb(): D1Database {
  const watchStore = new Map<string, Record<string, unknown>>();
  const snapshotStore = new Map<string, { payload: string; created_at: number }[]>();

  return {
    prepare: (sql: string) => {
      const stmt = {
        binds: [] as unknown[],
        bind(...args: unknown[]) {
          this.binds = args;
          return this;
        },
        async run() {
          if (sql.includes('INSERT INTO watch_spaces')) {
            const [watchId, workspaceId, address, , radiusKm, created, updated] = this.binds as [
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
          return {};
        },
        async first() {
          if (sql.includes('SELECT watch_id FROM watch_spaces')) {
            const [workspaceId, , radiusKm] = this.binds as [string, string, number];
            for (const row of watchStore.values()) {
              if (row.workspace_id === workspaceId && row.radius_km === radiusKm) {
                return { watch_id: row.watch_id };
              }
            }
            return null;
          }
          if (sql.includes('FROM watch_spaces WHERE watch_id')) {
            const [watchId, workspaceId] = this.binds as [string, string];
            const row = watchStore.get(watchId);
            if (!row || row.workspace_id !== workspaceId) return null;
            return row;
          }
          if (sql.includes('COUNT(*) AS c FROM watch_snapshots')) {
            const watchId = String(this.binds[0]);
            return { c: snapshotStore.get(watchId)?.length ?? 0 };
          }
          if (sql.includes('window_start FROM rate_limits')) {
            return null;
          }
          return null;
        },
        async all() {
          if (sql.includes('payload FROM watch_snapshots')) {
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
}
