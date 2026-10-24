import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { OSM_SNAPSHOT_BRAND_STATUS } from '../data/osm-snapshot-meta';

const REI = '205AF33F-118E-4C49-9721-6BDBAF981DA0';
const BLEECKER = { address: '350 Bleecker St, New York, NY 10014', latitude: 40.73352, longitude: -74.00271 };

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

/** REI SoHo supplement coordinates (OpenStreetMap node 2483671757). */
const REI_SOHO_LAT = 40.72483;
const REI_SOHO_LON = -73.99522;

function makeAssets() {
  const reiBrandIdx = 0;
  return {
    fetch: vi.fn(async (url: string) => {
      if (url.includes('tiles.local')) {
        const path = url.replace('https://tiles.local', '');
        if (path === '/tiles/brands.json') {
          return new Response(
            JSON.stringify({
              brands: [{ id: REI, name: 'REI', displayName: 'REI', count: 194 }],
            }),
            { status: 200 }
          );
        }
        if (path === '/tiles/dr5.json') {
          return new Response(
            JSON.stringify({
              gh: 'dr5',
              stores: [[reiBrandIdx, REI_SOHO_LAT, REI_SOHO_LON]],
            }),
            { status: 200 }
          );
        }
        return new Response('missing', { status: 404 });
      }
      const path = url.replace('https://osm.local', '');
      if (path === '/osm-tiles/brands.json') {
        return new Response(
          JSON.stringify({
            brands: [{ id: REI, name: 'REI', qid: 'Q3414933', count: 190 }],
          }),
          { status: 200 }
        );
      }
      if (path === '/osm-tiles/dr5.json') {
        return new Response(
          JSON.stringify({
            gh: 'dr5',
            stores: [[reiBrandIdx, REI_SOHO_LAT, REI_SOHO_LON]],
          }),
          { status: 200 }
        );
      }
      return new Response('missing', { status: 404 });
    }),
  } as unknown as Fetcher;
}

describe('REI at 350 Bleecker St', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    OSM_SNAPSHOT_BRAND_STATUS[REI] = 'ok';
  });

  it('does not mark REI verified absent when SoHo store is in snapshot tiles', async () => {
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'live',
      ASSETS: makeAssets(),
      QLOO_API_KEY: 'x',
    } as import('../index').Env);

    const verify = (
      service as unknown as {
        verifyFromOsmSnapshot: (
          id: string,
          loc: { address: string; latitude: number; longitude: number },
          searchRadiusKm: number,
          absenceRadiusKm: number
        ) => Promise<{ status: string }>;
      }
    ).verifyFromOsmSnapshot;

    const result = await verify.call(service, REI, BLEECKER, 10, 3);
    expect(result.status).toBe('conflict - likely present');
  });
});
