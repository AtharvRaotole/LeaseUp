import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { wickerparkFixture } from '@leaseup/fixtures/worker';
import { OsmSnapshotCatalog } from '../services/osm-snapshot-catalog';
import { ResponseCache } from '../lib/response-cache';

const publicRoot = join(__dirname, '../../public');

function readAsset(host: 'osm.local', url: string): Response {
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
    if (url.includes('osm.local')) return readAsset('osm.local', url);
    return new Response('missing', { status: 404 });
  },
} as unknown as Fetcher;

describe('OSM snapshot nearby tenants (Wicker Park)', () => {
  it('lists distinct ok brands within radius sorted by distance', async () => {
    const { latitude, longitude } = wickerparkFixture.location;
    const responseCache = new ResponseCache();
    const osm = new OsmSnapshotCatalog(assets, responseCache);
    const rows = await osm.listNearbyTenants(latitude, longitude, 10, 24);
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) {
      const cur = rows[i];
      const prev = rows[i - 1];
      expect(cur?.distanceKm).toBeGreaterThanOrEqual(prev?.distanceKm ?? 0);
    }
    const ids = new Set(rows.map((r) => r.entityId));
    expect(ids.size).toBe(rows.length);
    for (const row of rows) {
      expect(row.name.length).toBeGreaterThan(0);
      expect(row.distanceKm).toBeLessThanOrEqual(10);
    }
  });
});
