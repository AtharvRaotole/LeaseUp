import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QlooClient, normalizeHeatmapCells, clampQlooTake, QLOO_MAX_TAKE } from '../providers/qloo';
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
      json: async () => ({
        results: {
          entities: [
            { entity_id: 'id-2', name: 'B', query: { affinity: 0.8 } },
            { entity_id: 'id-1', name: 'A', query: { affinity: 0.9 } },
          ],
        },
      }),
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

  it('never sends take greater than 50 to Qloo', async () => {
    const client = new QlooClient(makeEnv({ APP_MODE: 'live', QLOO_API_KEY: 'test-key' }));
    const brandIds = getStoreBrandIds();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: { entities: [] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.getBrandInsights({
      location: { kind: 'point', latitude: 41.9, longitude: -87.67, radiusKm: 10 },
      brandIds,
      take: 227,
    });

    for (const call of fetchMock.mock.calls) {
      const url = decodeURIComponent(call[0] as string);
      const match = url.match(/take=(\d+)/);
      expect(match).toBeTruthy();
      expect(Number(match![1])).toBeLessThanOrEqual(QLOO_MAX_TAKE);
    }
    expect(clampQlooTake(227)).toBe(50);
    expect(clampQlooTake(0)).toBe(1);
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

    const url = decodeURIComponent(fetchMock.mock.calls[0]?.[0] as string);
    expect(url).toContain('signal.location=POINT(');
    expect(url).toContain('-87.6776');
    expect(url).toContain('41.9088');
    expect(url).toContain('signal.location.radius=10000');
    expect(url).not.toContain('signal.location.latitude');
  });

  it('retries on 429 then succeeds', async () => {
    const client = new QlooClient(makeEnv({ APP_MODE: 'live', QLOO_API_KEY: 'test-key' }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: { entities: [{ entity_id: 'x', name: 'X', query: { affinity: 0.2 } }] },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const insights = await client.getBrandInsights({
      location: { kind: 'point', latitude: 40, longitude: -105, radiusKm: 10 },
      take: 10,
    });
    expect(insights).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(kv.put).toHaveBeenCalled();
  });

  it('does not cache when all fetch attempts fail', async () => {
    const client = new QlooClient(makeEnv({ APP_MODE: 'live', QLOO_API_KEY: 'test-key' }));
    vi.mocked(kv.put).mockClear();

    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network down'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      client.getBrandInsights({
        location: { kind: 'point', latitude: 40, longitude: -105, radiusKm: 10 },
        take: 10,
      })
    ).rejects.toMatchObject({ code: 'QLOO_UNAVAILABLE' });
    expect(kv.put).not.toHaveBeenCalled();
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
