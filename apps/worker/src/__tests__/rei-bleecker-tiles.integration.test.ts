import { beforeAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BLEECKER_NYC, REI_ENTITY_ID } from '@leaseup/fixtures/worker';
import { GeoTileStoreCatalog } from '../services/store-catalog';
import { OsmSnapshotCatalog } from '../services/osm-snapshot-catalog';
import { ResponseCache } from '../lib/response-cache';
import { OSM_SNAPSHOT_BRAND_STATUS } from '../data/osm-snapshot-meta';

const publicRoot = join(__dirname, '../../public');

function readAsset(host: 'tiles.local' | 'osm.local', url: string): Response {
  const path = url.replace(`https://${host}`, '');
  const file = join(publicRoot, path);
  try {
    return new Response(readFileSync(file), { status: 200 });
  } catch {
    return new Response('missing', { status: 404 });
  }
}

const assets = {
  fetch: async (url: string) => {
    if (url.includes('tiles.local')) return readAsset('tiles.local', url);
    if (url.includes('osm.local')) return readAsset('osm.local', url);
    return new Response('missing', { status: 404 });
  },
} as unknown as Fetcher;

describe('REI SoHo on committed geotiles (350 Bleecker)', () => {
  beforeAll(() => {
    OSM_SNAPSHOT_BRAND_STATUS[REI_ENTITY_ID] = 'ok';
  });

  it('finds REI within trade area (after supplement), not a distant-only false absence', async () => {
    const responseCache = new ResponseCache();
    const catalog = new GeoTileStoreCatalog(assets, responseCache);
    const osm = new OsmSnapshotCatalog(assets, responseCache);

    const { latitude, longitude } = BLEECKER_NYC;
    const nearby = await catalog.findStoresNearby(REI_ENTITY_ID, latitude, longitude, 10);
    const nearestAtp = nearby[0]?.distance;
    const nearestOsm = await osm.nearestStoreKm(REI_ENTITY_ID, latitude, longitude, 50);

    expect(nearestAtp).toBeDefined();
    expect(nearestAtp!).toBeLessThan(2);
    expect(nearestOsm).toBeDefined();
    expect(nearestOsm!).toBeLessThan(2);

    expect(nearestAtp!).toBeGreaterThan(1);
    expect(nearestAtp!).toBeLessThan(1.3);
  });
});
