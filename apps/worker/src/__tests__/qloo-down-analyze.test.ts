import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { TASTE_UNAVAILABLE_RANKING_NOTICE } from '../lib/qloo-chain-fallback';
import {
  createCountingKvNamespace,
  installWorkersCacheApiStub,
} from './helpers/kv-counting';
import { KV_ROUTE_BUDGET } from '../lib/kv-route-budget';

const db = {
  prepare: () => {
    const stmt = {
      bind: () => stmt,
      run: async () => ({}),
      first: async () => null,
    };
    return stmt;
  },
} as unknown as D1Database;

function demoEnv(forceQlooDown = false) {
  const kv = createCountingKvNamespace();
  return {
    env: {
      DB: db,
      CACHE: kv.CACHE,
      APP_MODE: 'demo',
      FORCE_QLOO_DOWN: forceQlooDown ? '1' : undefined,
    } as import('../index').Env,
    kv,
  };
}

describe('analyze when Qloo is unavailable', () => {
  beforeEach(() => {
    installWorkersCacheApiStub();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns chain-size-ranked report with notice (FORCE_QLOO_DOWN)', async () => {
    const { env, kv } = demoEnv(true);
    const service = new AnalysisService(env);
    const started = performance.now();
    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'qloo-down-run',
      'ip'
    );
    expect(performance.now() - started).toBeLessThan(15_000);
    expect(result.tasteDataStatus).toBe('unavailable');
    expect(result.rankingNotice).toBe(TASTE_UNAVAILABLE_RANKING_NOTICE);
    expect(result.prospects.length).toBeGreaterThan(0);
    expect(result.warnings).toContain(TASTE_UNAVAILABLE_RANKING_NOTICE);
    for (const pack of result.prospects) {
      expect(pack.brand.affinity).toBe(0);
      expect(pack.brand.tasteFitBeyondChainPercentile).toBeUndefined();
      expect(pack.tradeAreaTaste).toBeUndefined();
    }
    for (const row of result.rankings ?? []) {
      expect(row.affinity).toBe(0);
      expect(row.tasteFitBeyondChainPercentile).toBeUndefined();
    }
    expect(result.tradeAreaShoppers).toBeUndefined();
    expect(kv.puts).toHaveLength(KV_ROUTE_BUDGET.analyzeCold.puts);
    expect(kv.gets).toHaveLength(KV_ROUTE_BUDGET.analyzeCold.gets);
  });

  it('analyzeWithSteps streams taste step then completes', async () => {
    const { env } = demoEnv(true);
    const service = new AnalysisService(env);
    const steps: string[] = [];
    const result = await service.analyzeWithSteps(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'qloo-down-stream',
      'ip',
      async (step) => {
        steps.push(step.id);
      }
    );
    expect(steps).toContain('taste');
    expect(result.tasteDataStatus).toBe('unavailable');
    expect(result.prospects.length).toBeGreaterThan(0);
  });
});

describe('analyze when live Qloo HTTP fails', () => {
  beforeEach(() => {
    installWorkersCacheApiStub();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('openstreetmap.org')) {
          return {
            ok: true,
            json: async () => [
              {
                lat: '41.9088',
                lon: '-87.6776',
                display_name: 'Wicker Park, Chicago',
                address: { neighbourhood: 'Wicker Park', city: 'Chicago' },
              },
            ],
          };
        }
        if (url.includes('/v2/insights')) {
          return { ok: false, status: 503, statusText: 'Unavailable' };
        }
        if (url.includes('overpass')) {
          return { ok: true, json: async () => ({ elements: [] }) };
        }
        return { ok: false, status: 404 };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  for (const status of [503, 429, 500]) {
    it(`falls back on Qloo HTTP ${status}`, async () => {
      vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/v2/insights')) {
          return { ok: false, status, statusText: 'err' } as Response;
        }
        if (url.includes('openstreetmap.org')) {
          return {
            ok: true,
            json: async () => [
              {
                lat: '41.9088',
                lon: '-87.6776',
                display_name: 'Wicker Park, Chicago',
                address: { neighbourhood: 'Wicker Park', city: 'Chicago' },
              },
            ],
          } as Response;
        }
        if (url.includes('overpass')) {
          return { ok: true, json: async () => ({ elements: [] }) } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      const kv = createCountingKvNamespace();
      const env = {
        DB: db,
        CACHE: kv.CACHE,
        APP_MODE: 'live',
        QLOO_API_KEY: 'test-key',
      } as import('../index').Env;
      const result = await new AnalysisService(env).analyze(
        { address: '1574 N Milwaukee Ave, Chicago, IL 60622', radius: 10 },
        `qloo-${status}`,
        'ip'
      );
      expect(result.tasteDataStatus).toBe('unavailable');
      expect(result.prospects.length).toBeGreaterThan(0);
      expect(result.prospects.every((p) => p.brand.affinity === 0)).toBe(true);
    });
  }
});
