import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AnalysisService } from '../services/analysis';
import { getStoreBrandIds } from '@leaseup/fixtures';

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

function loadWickerRaw(): Array<[string, number]> {
  const paths = [
    join(process.cwd(), 'data/research/round2/neigh_test_10km.json'),
    join(process.cwd(), '../../data/research/round2/neigh_test_10km.json'),
  ];
  for (const path of paths) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
        raw: Record<string, Array<[string, number]>>;
      };
      return parsed.raw['Wicker Park, Chicago'] ?? [];
    } catch {
      continue;
    }
  }
  return [];
}

describe('AnalysisService live path (recorded Qloo response)', () => {
  beforeEach(() => {
    const raw = loadWickerRaw();
    const brandIds = getStoreBrandIds();
    const entities = raw.map(([name, affinity], index) => ({
      entity_id: brandIds[index] || `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      name,
      query: { affinity, affinity_rank: affinity },
    }));

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
          return {
            ok: true,
            status: 200,
            json: async () => ({ results: { entities } }),
          };
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
  });

  it('completes analyze using geocoded point + radius against mocked Qloo', async () => {
    const service = new AnalysisService(liveEnv());
    const result = await service.analyze(
      { address: '1574 N Milwaukee Ave, Chicago, IL 60622', radius: 10 },
      'live-run',
      'iphash'
    );

    expect(result.mode).toBe('live');
    expect(result.backtest.precisionAt10).toBeGreaterThan(0);
    const qlooUrl = (vi.mocked(fetch).mock.calls.find((c) => String(c[0]).includes('/v2/insights'))?.[0] ||
      '') as string;
    const decoded = decodeURIComponent(qlooUrl);
    expect(decoded).toContain('signal.location=POINT(');
    expect(decoded).toContain('signal.location.radius=10000');
  });
});
