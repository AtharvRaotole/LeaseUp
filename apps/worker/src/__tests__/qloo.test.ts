import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QlooClient, normalizeHeatmapCells } from '../providers/qloo';
import { ConfigurationError } from '../lib/errors';
import { getStoreBrandIds } from '@leaseup/fixtures';
import { sha256Short } from '../lib/cache-key';

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
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(undefined),
} as unknown as KVNamespace;

function makeEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DB: db,
    CACHE: kv,
    APP_MODE: 'demo',
    QLOO_API_KEY: '',
    ...overrides,
  } as import('../index').Env;
}

describe('QlooClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws ConfigurationError in live mode without API key', () => {
    expect(() => new QlooClient(makeEnv({ APP_MODE: 'live', QLOO_API_KEY: '' }))).toThrow(
      ConfigurationError
    );
  });

  it('uses hashed brand list in cache key under 512 bytes', async () => {
    const client = new QlooClient(makeEnv({ APP_MODE: 'live', QLOO_API_KEY: 'test-key' }));
    const brandIds = getStoreBrandIds();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: { entities: [{ entity_id: 'a', name: 'A' }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.getBrandInsights({
      location: { kind: 'point', latitude: 41.9, longitude: -87.67, radiusKm: 10 },
      brandIds,
      take: 50,
      runId: 'test',
    });

    const cacheKey = vi.mocked(kv.put).mock.calls[0]?.[0] as string;
    expect(cacheKey.length).toBeLessThan(512);
    expect(cacheKey).not.toContain(brandIds[0]);
    const hash = await sha256Short(brandIds.join(','));
    expect(cacheKey).toContain(hash);
  });

  it('sends geocoded point + radius to Qloo in live mode', async () => {
    const client = new QlooClient(makeEnv({ APP_MODE: 'live', QLOO_API_KEY: 'test-key' }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: { entities: [] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.getBrandInsights({
      location: { kind: 'point', latitude: 41.9088, longitude: -87.6776, radiusKm: 10 },
      take: 10,
    });

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('signal.location.latitude=41.9088');
    expect(url).toContain('signal.location.longitude=-87.6776');
    expect(url).toContain('filter.location.radius=10');
  });

  it('retries on 429 then succeeds', async () => {
    const client = new QlooClient(makeEnv({ APP_MODE: 'live', QLOO_API_KEY: 'test-key' }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: { entities: [] } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const insights = await client.getBrandInsights({
      location: { kind: 'query', query: 'Boulder, Colorado' },
      take: 10,
    });
    expect(insights).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves recorded fixture insights in demo mode (no fabricated IDs)', async () => {
    const client = new QlooClient(makeEnv());
    const insights = await client.getBrandInsights({
      location: { kind: 'query', query: 'Wicker Park, Chicago' },
    });
    expect(insights.length).toBeGreaterThan(10);
    expect(insights[0]?.entity_id).toMatch(/^[0-9A-F-]{36}$/i);
    expect(insights.some((i) => i.entity_id.includes('urn:qloo'))).toBe(false);
  });
});

describe('normalizeHeatmapCells', () => {
  it('reads latitude/longitude from cell.location', () => {
    const cells = normalizeHeatmapCells([
      {
        location: { latitude: 41.91, longitude: -87.68 },
        affinity_rank: 0.42,
        affinity: 0.42,
      },
    ]);
    expect(cells).toEqual([
      {
        latitude: 41.91,
        longitude: -87.68,
        affinity_rank: 0.42,
        affinity: 0.42,
        popularity: undefined,
      },
    ]);
  });
});
