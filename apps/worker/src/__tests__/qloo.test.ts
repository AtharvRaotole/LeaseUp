import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QlooClient } from '../providers/qloo';
import { ConfigurationError } from '../lib/errors';

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

  it('includes brandIds and take in cache key', async () => {
    const client = new QlooClient(makeEnv({ APP_MODE: 'live', QLOO_API_KEY: 'test-key' }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: { entities: [{ entity_id: 'a', name: 'A' }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.getBrandInsights({
      location: 'Wicker Park, Chicago',
      brandIds: ['id-1', 'id-2'],
      take: 25,
      runId: 'test',
    });

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('filter.results.entities=id-1%2Cid-2');
    expect(url).toContain('take=25');

    expect(kv.put).toHaveBeenCalledWith(
      expect.stringContaining('id-1,id-2'),
      expect.any(String),
      expect.any(Object)
    );
    expect(vi.mocked(kv.put).mock.calls[0]?.[0]).toContain('take=25');
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

    const insights = await client.getBrandInsights({ location: 'Boulder, Colorado', take: 10 });
    expect(insights).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves recorded fixture insights in demo mode (no fabricated IDs)', async () => {
    const client = new QlooClient(makeEnv());
    const insights = await client.getBrandInsights({ location: 'Wicker Park, Chicago' });
    expect(insights.length).toBeGreaterThan(10);
    expect(insights[0]?.entity_id).toMatch(/^[0-9A-F-]{36}$/i);
    expect(insights.some((i) => i.entity_id.includes('urn:qloo'))).toBe(false);
  });
});
