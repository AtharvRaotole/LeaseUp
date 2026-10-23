import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { OSM_SNAPSHOT_BRAND_STATUS } from '../data/osm-snapshot-meta';

const BRAND_A = '205AF33F-118E-4C49-9721-6BDBAF981DA0';
const BRAND_B = '2D890327-8794-4C5A-898F-FFF0323325CF';

const db = {
  prepare: () => {
    const stmt = { bind: () => stmt, run: async () => ({}), first: async () => null };
    return stmt;
  },
} as unknown as D1Database;

const kv = {
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(undefined),
} as unknown as KVNamespace;

function makeAssets(tiles: Record<string, unknown>) {
  return {
    fetch: vi.fn(async (url: string) => {
      if (url.includes('tiles.local')) {
        const path = url.replace('https://tiles.local', '');
        if (path === '/tiles/brands.json') {
          return new Response(
            JSON.stringify({
              brands: [{ id: BRAND_A, name: 'REI', displayName: 'REI', count: 193 }],
            }),
            { status: 200 }
          );
        }
        const gh = path.match(/\/tiles\/(.+)\.json$/)?.[1];
        if (gh && tiles[gh]) {
          return new Response(JSON.stringify(tiles[gh]), { status: 200 });
        }
        return new Response('missing', { status: 404 });
      }
      const path = url.replace('https://osm.local', '');
      if (path === '/osm-tiles/brands.json') {
        return new Response(JSON.stringify(tiles.brands), { status: 200 });
      }
      const gh = path.match(/\/osm-tiles\/(.+)\.json$/)?.[1];
      if (gh && tiles[gh]) {
        return new Response(JSON.stringify(tiles[gh]), { status: 200 });
      }
      return new Response('missing', { status: 404 });
    }),
  } as unknown as Fetcher;
}

describe('OSM snapshot verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    OSM_SNAPSHOT_BRAND_STATUS[BRAND_A] = 'ok';
    OSM_SNAPSHOT_BRAND_STATUS[BRAND_B] = 'failed';
  });

  it('marks verified when brand absent in snapshot tiles', async () => {
    const assets = makeAssets({
      brands: {
        brands: [{ id: BRAND_A, name: 'REI', qid: 'Q3414933', count: 1 }],
      },
      dp3: { gh: 'dp3', stores: [[0, 34, -118]] },
    });

    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'live',
      ASSETS: assets,
      QLOO_API_KEY: 'x',
    } as import('../index').Env);

    const verify = (
      service as unknown as {
        verifyFromOsmSnapshot: (
          id: string,
          loc: { address: string; latitude: number; longitude: number },
          radius: number
        ) => Promise<{ status: string }>;
      }
    ).verifyFromOsmSnapshot;
    const result = await verify.call(
      service,
      BRAND_A,
      { address: 'x', latitude: 41.91, longitude: -87.68 },
      10
    );

    expect(result.status).toBe('verified (2 sources)');
  });

  it('treats failed snapshot brands as single source', async () => {
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'live',
      ASSETS: makeAssets({ brands: { brands: [] } }),
      QLOO_API_KEY: 'x',
    } as import('../index').Env);

    const verify = (
      service as unknown as {
        verifyFromOsmSnapshot: (
          id: string,
          loc: { address: string; latitude: number; longitude: number },
          radius: number
        ) => Promise<{ status: string }>;
      }
    ).verifyFromOsmSnapshot;
    const result = await verify.call(
      service,
      BRAND_B,
      { address: 'x', latitude: 41.91, longitude: -87.68 },
      10
    );

    expect(result.status).toBe('unverified (1 source)');
  });

  it('does not cache unavailable verify payloads', async () => {
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'live',
      ASSETS: makeAssets({ brands: { brands: [] } }),
      QLOO_API_KEY: 'x',
    } as import('../index').Env);

    const prospects = [
      {
        brand: {
          entityId: BRAND_B,
          name: 'Test',
          affinity: 0.9,
          affinityRank: 1,
          verified: 'unverified (1 source)' as const,
          verificationSources: ['All The Places (CC0)'],
          nationalStoreCount: 10,
          nearbyStoreCount: 0,
        },
        reasons: [],
        outreachDraft: '',
      },
    ];

    const out = await service.applyOsmVerification(
      { address: 'x', latitude: 41.91, longitude: -87.68 },
      10,
      prospects
    );
    expect(out.summary.unavailable).toBe(false);
    const putCalls = vi.mocked(kv.put).mock.calls;
    for (const call of putCalls) {
      const body = JSON.parse(call[1] as string);
      expect(body.summary?.unavailable).not.toBe(true);
    }
  });
});
