import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import {
  createCountingKvNamespace,
  installWorkersCacheApiStub,
} from './helpers/kv-counting';

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

  it('fails analyze when FORCE_QLOO_DOWN (no chain-size ranking)', async () => {
    const { env } = demoEnv(true);
    const service = new AnalysisService(env);
    await expect(
      service.analyze(
        { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
        'qloo-down-run',
        'ip'
      )
    ).rejects.toMatchObject({ code: 'QLOO_UNAVAILABLE' });
  });

  it('analyzeWithSteps propagates Qloo outage', async () => {
    const { env } = demoEnv(true);
    const service = new AnalysisService(env);
    await expect(
      service.analyzeWithSteps(
        { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
        'qloo-down-stream',
        'ip',
        async () => undefined
      )
    ).rejects.toMatchObject({ code: 'QLOO_UNAVAILABLE' });
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
    it(`fails analyze on Qloo HTTP ${status} (no fabricated rankings)`, async () => {
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
      await expect(
        new AnalysisService(env).analyze(
          { address: '1574 N Milwaukee Ave, Chicago, IL 60622', radius: 10 },
          `qloo-${status}`,
          'ip'
        )
      ).rejects.toMatchObject({ code: 'QLOO_UNAVAILABLE' });
    });
  }
});
