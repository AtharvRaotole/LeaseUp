import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrandReverseService } from '../services/brand-reverse';
import { normalizeHeatmapCells } from '../providers/qloo';

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

function demoEnv() {
  return {
    DB: db,
    CACHE: kv,
    APP_MODE: 'demo',
  } as import('../index').Env;
}

describe('BrandReverseService', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('nominatim.openstreetmap.org/reverse')) {
          return {
            ok: true,
            json: async () => ({
              display_name: 'River North, Chicago',
              address: { neighbourhood: 'River North', city: 'Chicago' },
            }),
          };
        }
        return { ok: false, status: 404 };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists tracked brands with display names', () => {
    const service = new BrandReverseService(demoEnv());
    const brands = service.listBrands('bath');
    expect(brands.length).toBeGreaterThan(0);
    expect(brands[0]?.displayName.toLowerCase()).toContain('bath');
  });

  it('returns demo chicago heatmap opportunities', async () => {
    const service = new BrandReverseService(demoEnv());
    const result = await service.analyze(
      '54617D9D-5EC7-45E0-8B7F-360DADB0FE7E',
      'chicago'
    );
    expect(result.source).toBe('heatmap');
    expect(result.cells.length).toBeGreaterThan(0);
    expect(result.opportunities.length).toBeGreaterThan(0);
    expect(result.opportunities[0]?.reportPath).toContain('/r/site?');
  });
});

describe('Qloo heatmap mock', () => {
  it('builds heatmap query params for brand reverse', () => {
    const url = new URL('https://hackathon.api.qloo.com/v2/insights');
    url.searchParams.set('filter.type', 'urn:heatmap');
    url.searchParams.set('filter.location', 'POINT(-87.6298 41.8781)');
    url.searchParams.set('filter.location.radius', '35000');
    url.searchParams.set(
      'signal.interests.entities',
      '54617D9D-5EC7-45E0-8B7F-360DADB0FE7E'
    );
    expect(url.searchParams.get('filter.type')).toBe('urn:heatmap');
    const cells = normalizeHeatmapCells([
      {
        location: { lat: 41.8819, lon: -87.6278 },
        query: { affinity: 0.8123, affinity_rank: 4 },
      },
    ]);
    expect(cells[0]?.affinity).toBe(0.8123);
  });
});
