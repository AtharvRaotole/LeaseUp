import { describe, it, expect, vi, afterEach } from 'vitest';
import { AnalysisService } from '../services/analysis';

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

describe('Portfolio confirmed coordinates', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends different Qloo signal.location for different confirmed coordinates', async () => {
    const qlooUrls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/v2/insights')) {
          qlooUrls.push(decodeURIComponent(url));
          return {
            ok: true,
            status: 200,
            json: async () => ({ results: { entities: [] } }),
          };
        }
        if (url.includes('overpass')) {
          return { ok: true, json: async () => ({ elements: [] }) };
        }
        return { ok: false, status: 404 };
      })
    );

    const service = new AnalysisService(liveEnv());
    await service.analyze(
      {
        address: '350 Bleecker St, New York, NY',
        radius: 10,
        confirmedLocation: {
          address: '350 Bleecker St, New York, NY',
          latitude: 40.734,
          longitude: -74.003,
          neighborhood: 'West Village',
          resolvedAddress: 'Manhattan pick',
        },
      },
      'run-a',
      'ip'
    );
    await service.analyze(
      {
        address: '350 Bleecker St, New York, NY',
        radius: 10,
        confirmedLocation: {
          address: '350 Bleecker St, New York, NY',
          latitude: 40.7,
          longitude: -73.92,
          neighborhood: 'Ridgewood',
          resolvedAddress: 'Brooklyn pick',
        },
      },
      'run-b',
      'ip'
    );

    const a = qlooUrls.find((u) => u.includes('-74.003')) ?? '';
    const b = qlooUrls.find((u) => u.includes('-73.92')) ?? '';
    expect(a).toContain('signal.location=POINT(-74.003');
    expect(b).toContain('signal.location=POINT(-73.92');
    expect(a).not.toEqual(b);
  });
});
