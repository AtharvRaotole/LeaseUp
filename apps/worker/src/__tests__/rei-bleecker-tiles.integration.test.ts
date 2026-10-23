import { beforeAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BLEECKER_NYC, REI_ENTITY_ID } from '@leaseup/fixtures/worker';
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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestReiKmFromTilePack(
  brandsPath: string,
  tilePath: string,
  lat: number,
  lon: number,
  radiusKm: number
): number | undefined {
  const brands = JSON.parse(readFileSync(join(publicRoot, brandsPath), 'utf8')) as {
    brands: Array<{ id: string }>;
  };
  const tile = JSON.parse(readFileSync(join(publicRoot, tilePath), 'utf8')) as {
    stores: Array<[number, number, number]>;
  };
  const brandIdx = brands.brands.findIndex((b) => b.id === REI_ENTITY_ID);
  if (brandIdx < 0) return undefined;
  let nearest = Infinity;
  for (const [bIdx, tLat, tLon] of tile.stores) {
    if (bIdx !== brandIdx) continue;
    const d = haversineKm(lat, lon, tLat, tLon);
    if (d <= radiusKm && d < nearest) nearest = d;
  }
  return nearest === Infinity ? undefined : nearest;
}

describe('REI SoHo on committed geotiles (350 Bleecker)', () => {
  beforeAll(() => {
    OSM_SNAPSHOT_BRAND_STATUS[REI_ENTITY_ID] = 'ok';
  });

  it('finds REI within trade area (after supplement), not a distant-only false absence', async () => {
    const { latitude, longitude } = BLEECKER_NYC;
    const nearestAtp = nearestReiKmFromTilePack('tiles/brands.json', 'tiles/dr5.json', latitude, longitude, 10);
    const responseCache = new ResponseCache();
    const osm = new OsmSnapshotCatalog(assets, responseCache);
    const nearestOsm = await osm.nearestStoreKm(REI_ENTITY_ID, latitude, longitude, 50);

    expect(nearestAtp).toBeDefined();
    expect(nearestAtp!).toBeLessThan(2);
    expect(nearestOsm).toBeDefined();
    expect(nearestOsm!).toBeLessThan(2);
    expect(nearestAtp!).toBeGreaterThan(1);
    expect(nearestOsm!).toBeGreaterThan(1);
  });
});
