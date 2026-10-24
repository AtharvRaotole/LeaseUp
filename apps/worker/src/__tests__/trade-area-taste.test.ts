import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadTradeAreaTasteForProspect } from '../lib/trade-area-taste';
import { QlooClient } from '../providers/qloo';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

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

const ULTA = '0F77E9A4-121C-4941-ACE1-28502DBF1865';

function client(mode: 'demo' | 'live') {
  return new QlooClient({
    DB: db,
    CACHE: kv,
    APP_MODE: mode,
    QLOO_API_KEY: mode === 'live' ? 'test-key' : '',
  } as import('../index').Env);
}

function audienceBody(rows: Array<[string, string, number]>) {
  return {
    success: true,
    results: {
      entities: rows.map(([id, name, affinity]) => ({ entity_id: id, name, query: { affinity } })),
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadTradeAreaTasteForProspect', () => {
  it('returns verified overlap audiences for Boulder demo Ulta (live recordings)', async () => {
    const taste = await loadTradeAreaTasteForProspect(
      client('demo'),
      { address: DEMO_CHIP_ADDRESSES.boulder, latitude: 40.0179234, longitude: -105.2805434 },
      ULTA,
      10
    );
    expect(taste?.tags).toEqual([]);
    expect(taste?.audiences.map((a) => a.name)).toContain('Health And Beauty');
  });

  it('returns undefined for a demo brand with no recording', async () => {
    const taste = await loadTradeAreaTasteForProspect(
      client('demo'),
      { address: DEMO_CHIP_ADDRESSES.boulder, latitude: 40.0179234, longitude: -105.2805434 },
      '00000000-0000-0000-0000-000000000000',
      10
    );
    expect(taste).toBeUndefined();
  });

  it('live: intersects brand-only and location-only audience calls', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        calls.push(url);
        const body = url.includes('signal.interests.entities')
          ? audienceBody([
              ['beauty', 'Health And Beauty', 0.9],
              ['golf', 'Golf', 0.8],
            ])
          : audienceBody([
              ['hiking', 'Hiking', 0.99],
              ['beauty', 'Health And Beauty', 0.7],
            ]);
        return new Response(JSON.stringify(body), { status: 200 });
      })
    );
    const taste = await loadTradeAreaTasteForProspect(
      client('live'),
      { address: '1 Main St, Somewhere, US', latitude: 40, longitude: -105 },
      'BRAND-X',
      10
    );
    expect(calls).toHaveLength(2);
    expect(calls.some((u) => u.includes('signal.location') && !u.includes('signal.interests'))).toBe(true);
    expect(calls.some((u) => u.includes('signal.interests.entities=BRAND-X') && !u.includes('signal.location'))).toBe(true);
    expect(taste?.audiences.map((a) => a.name)).toEqual(['Health And Beauty']);
    expect(taste?.audiences[0]).toMatchObject({ affinity: 0.9, affinityRank: 2 });
  });

  it('live: no section when only the location has the audience', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const body = url.includes('signal.interests.entities')
          ? audienceBody([['golf', 'Golf', 0.8]])
          : audienceBody([['hiking', 'Hiking', 0.99]]);
        return new Response(JSON.stringify(body), { status: 200 });
      })
    );
    const taste = await loadTradeAreaTasteForProspect(
      client('live'),
      { address: '1 Main St, Somewhere, US', latitude: 40, longitude: -105 },
      'BRAND-X',
      10
    );
    expect(taste).toBeUndefined();
  });
});
