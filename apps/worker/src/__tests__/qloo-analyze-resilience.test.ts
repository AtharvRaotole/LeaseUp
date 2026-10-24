import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { getStoreBrandIds } from '@leaseup/fixtures';
import { qlooUnavailableError } from '../providers/qloo-fetch';
import { TASTE_UNAVAILABLE_RANKING_NOTICE } from '../lib/qloo-chain-fallback';
import { installWorkersCacheApiStub } from './helpers/kv-counting';
import { COLD_ANALYZE_ADDRESS } from './helpers/cold-analyze-fetch-mock';

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

const kv = {
  get: async () => null,
  put: async () => undefined,
} as unknown as KVNamespace;

function liveEnv() {
  return {
    DB: db,
    CACHE: kv,
    APP_MODE: 'live',
    QLOO_API_KEY: 'test-key',
  } as import('../index').Env;
}

function brandInsightsEntities() {
  const brandIds = getStoreBrandIds();
  return brandIds.map((entity_id, index) => ({
    entity_id,
    name: `Brand ${index}`,
    query: { affinity: 0.4 + (index % 40) / 100, affinity_rank: 0.4 },
  }));
}

describe('analyze Qloo resilience (fixtures only)', () => {
  beforeEach(() => {
    installWorkersCacheApiStub();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('completes when per-brand taste explainability times out (no 503)', async () => {
    const entities = brandInsightsEntities();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('nominatim.openstreetmap.org')) {
          return {
            ok: true,
            json: async () => [
              {
                lat: '30.2672',
                lon: '-97.7431',
                display_name: COLD_ANALYZE_ADDRESS,
                address: { city: 'Austin' },
              },
            ],
          };
        }
        if (url.includes('/v2/insights') && url.includes('signal.interests.entities')) {
          await new Promise((r) => setTimeout(r, 50));
          throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
        }
        if (url.includes('/v2/insights')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ results: { entities } }),
          };
        }
        return { ok: false, status: 404 };
      })
    );

    const service = new AnalysisService(liveEnv());
    const result = await service.analyze(
      { address: COLD_ANALYZE_ADDRESS, radius: 10 },
      'slow-per-brand',
      'ip'
    );

    expect(result.tasteDataStatus).not.toBe('unavailable');
    expect(result.prospects.length).toBeGreaterThan(0);
    expect(result.prospects.some((p) => p.tradeAreaTaste === undefined)).toBe(true);
  });

  it('fails analyze when main Qloo insights time out (no chain-size ranking)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('nominatim.openstreetmap.org')) {
          return {
            ok: true,
            json: async () => [
              {
                lat: '30.2672',
                lon: '-97.7431',
                display_name: COLD_ANALYZE_ADDRESS,
                address: { city: 'Austin' },
              },
            ],
          };
        }
        if (url.includes('/v2/insights')) {
          await new Promise((r) => setTimeout(r, 30));
          throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
        }
        return { ok: false, status: 404 };
      })
    );

    const service = new AnalysisService(liveEnv());
    await expect(
      service.analyze({ address: COLD_ANALYZE_ADDRESS, radius: 10 }, 'slow-main-qloo', 'ip')
    ).rejects.toMatchObject({ code: 'QLOO_UNAVAILABLE' });
  });

  it('analyzeStreamErrorPayload preserves QLOO_UNAVAILABLE code', async () => {
    const { analyzeStreamErrorPayload } = await import('../lib/analyze-stream-error');
    const payload = analyzeStreamErrorPayload(qlooUnavailableError());
    expect(payload.code).toBe('QLOO_UNAVAILABLE');
    expect(payload.message).toMatch(/Taste data/i);
  });
});
