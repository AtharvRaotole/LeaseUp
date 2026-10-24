import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures/worker';
import { AnalysisService } from '../services/analysis';
import { loadTileCatalogFromPaths } from '../lib/store-coverage-audit';

const publicRoot = join(__dirname, '../../public');
const osmTilesDir = join(__dirname, '../../../../data/osm-snapshot/tiles');

const assets = {
  fetch: async (url: string) => {
    if (url.includes('osm.local')) {
      const path = url.replace('https://osm.local', '');
      const file = join(publicRoot, path);
      try {
        return new Response(readFileSync(file), { status: 200 });
      } catch {
        return new Response('missing', { status: 404 });
      }
    }
    if (url.includes('tiles.local')) {
      const path = url.replace('https://tiles.local', '');
      const file = join(publicRoot, path);
      try {
        return new Response(readFileSync(file), { status: 200 });
      } catch {
        return new Response('missing', { status: 404 });
      }
    }
    return new Response('missing', { status: 404 });
  },
} as unknown as Fetcher;

const db = {
  prepare: () => {
    const stmt = { bind: () => stmt, run: async () => ({}), first: async () => null };
    return stmt;
  },
} as unknown as D1Database;

const kv = { get: async () => null, put: async () => undefined } as unknown as KVNamespace;

function makeService() {
  return new AnalysisService({
    DB: db,
    CACHE: kv,
    APP_MODE: 'demo',
    ASSETS: assets,
  } as import('../index').Env);
}

describe('Demo prospect store guard', () => {
  it('does not pitch brands as absent when ATP or OSM has a store in radius', async () => {
    const service = makeService();
    const catalog = loadTileCatalogFromPaths({
      atpExpandedPath: join(__dirname, '../../../../data/brands/store-locations.expanded.min.json'),
      osmTilesDir,
      supplementsPath: join(__dirname, '../../../../data/store-location-supplements.json'),
    });

    for (const [label, address] of Object.entries(DEMO_CHIP_ADDRESSES)) {
      const result = await service.analyze({ address, radius: 10 }, `guard-${label}`, 'ip');
      const absenceKm = result.prospectFunnel?.absenceRadiusKm ?? 10;
      for (const pack of result.prospects) {
        if (pack.brand.nearbyStoreCount !== 0) continue;
        const lat = result.location.latitude;
        const lon = result.location.longitude;
        const { atpKm, osmKm } = catalog.nearestBothKm(pack.brand.entityId, lat, lon, absenceKm);
        expect(
          atpKm === undefined && osmKm === undefined,
          `${label}: ${pack.brand.name} pitched with no nearby store but ATP=${atpKm?.toFixed(2)}km OSM=${osmKm?.toFixed(2)}km`
        ).toBe(true);
      }
    }
  });
});
