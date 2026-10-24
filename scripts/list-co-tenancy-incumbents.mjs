/**
 * Print nearest OSM snapshot tenants for co-tenancy recording (10 km, up to 15).
 * Usage: node scripts/list-co-tenancy-incumbents.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importWorkerModules } from './lib-worker-bundle.mjs';

const root = process.cwd();
const publicRoot = join(root, 'apps/worker/public');

const readAsset = (url) => {
  const path = url.replace('https://osm.local', '');
  const file = join(publicRoot, path);
  return new Response(readFileSync(file), { status: 200 });
};

const assets = {
  fetch: async (url) => {
    if (url.includes('osm.local')) return readAsset(url);
    return new Response('missing', { status: 404 });
  },
};

const { OsmSnapshotCatalog } = await importWorkerModules(root, {
  OsmSnapshotCatalog: 'apps/worker/src/services/osm-snapshot-catalog.ts',
});
const { ResponseCache } = await importWorkerModules(root, {
  ResponseCache: 'apps/worker/src/lib/response-cache.ts',
});
const sites = [
  {
    id: 'bleecker',
    label: '350 Bleecker St NYC',
    latitude: 40.73352,
    longitude: -74.00271,
  },
  { id: 'wicker', label: 'Wicker chip', latitude: 41.9099418, longitude: -87.6772824 },
  { id: 'boulder', label: 'Boulder chip', latitude: 40.0179234, longitude: -105.2805434 },
  { id: 'sevierville', label: 'Sevierville chip', latitude: 35.8365438, longitude: -83.5589482 },
];

const osm = new OsmSnapshotCatalog(assets, new ResponseCache());
const RADIUS_KM = 10;

for (const site of sites) {
  const rows = await osm.listNearbyTenants(site.latitude, site.longitude, RADIUS_KM, 24);
  console.log(`\n## ${site.id} (${site.label})`);
  console.log(`lat ${site.latitude}, lon ${site.longitude}, radius ${RADIUS_KM} km\n`);
  rows.slice(0, 15).forEach((row, i) => {
    console.log(
      `${i + 1}. ${row.name}\t${row.entityId}\t${row.distanceKm.toFixed(2)} km`
    );
  });
}
