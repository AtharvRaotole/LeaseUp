/**
 * Record Qloo co-tenancy insights for demo mode (raw /v2/insights bodies).
 *
 *   pnpm --filter @leaseup/fixtures build && pnpm --filter @leaseup/worker build
 *   QLOO_API_KEY=... node scripts/record-co-tenancy-fixture.mjs
 *   QLOO_API_KEY=... node scripts/record-co-tenancy-fixture.mjs wicker boulder
 *
 * Writes packages/fixtures/src/co-tenancy-recorded/manifest.json
 * Keys: `${pitchEntityId}:${sha256(incumbents)}` (see coTenancyFixtureKey in worker).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const key = process.env.QLOO_API_KEY;
const baseUrl = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';
const RADIUS_KM = Number(process.env.LEASEUP_DEMO_RADIUS_KM || '10');
const MAX_PITCHES = 10;

const { boulderFixture } = require('../packages/fixtures/dist/boulder.js');
const { wickerparkFixture } = require('../packages/fixtures/dist/wicker-park.js');
const { seviervilleFixture } = require('../packages/fixtures/dist/sevierville.js');

const {
  incumbentEntityIdsForCoAffinity,
  coTenancyFixtureKey,
} = require('../apps/worker/dist/lib/co-tenancy-pairing.js');
const { OsmSnapshotCatalog } = require('../apps/worker/dist/services/osm-snapshot-catalog.js');
const { ResponseCache } = require('../apps/worker/dist/lib/response-cache.js');

const CHIPS = {
  wicker: { fixture: wickerparkFixture },
  boulder: { fixture: boulderFixture },
  sevierville: { fixture: seviervilleFixture },
};

const manifestPath = join(
  process.cwd(),
  'packages/fixtures/src/co-tenancy-recorded/manifest.json'
);

function formatWktPoint(lon, lat) {
  return `POINT(${lon} ${lat})`;
}

function loadManifest() {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function pitchEntityIdsFromFixture(fixture) {
  const seen = new Set();
  const ids = [];
  for (const row of fixture.insights ?? []) {
    const id = String(row.entity_id ?? row.entityId ?? '').toUpperCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= MAX_PITCHES) break;
  }
  return ids;
}

async function fetchCoAffinity(site, pitchEntityId, incumbentEntityIds) {
  const url = new URL('/v2/insights', baseUrl);
  url.searchParams.set('filter.type', 'urn:entity:brand');
  url.searchParams.set('filter.results.entities', pitchEntityId);
  url.searchParams.set('signal.location', formatWktPoint(site.longitude, site.latitude));
  url.searchParams.set('signal.location.radius', String(Math.round(RADIUS_KM * 1000)));
  url.searchParams.set('signal.interests.entities', incumbentEntityIds.join(','));
  url.searchParams.set('take', '50');
  url.searchParams.set('feature.explainability', 'true');

  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'X-Api-Key': key },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Qloo co-tenancy ${res.status}: ${text.slice(0, 240)}`);
  }
  return JSON.parse(text);
}

function makeOsmCatalog() {
  const publicRoot = join(process.cwd(), 'apps/worker/public');
  const { readFileSync: read } = require('node:fs');
  const assets = {
    fetch: async (url) => {
      if (!url.includes('osm.local')) return new Response('missing', { status: 404 });
      const path = url.replace('https://osm.local', '');
      const file = join(publicRoot, path);
      try {
        return new Response(read(file), { status: 200 });
      } catch {
        return new Response('missing', { status: 404 });
      }
    },
  };
  return new OsmSnapshotCatalog(assets, new ResponseCache());
}

async function recordChip(chipId, manifest) {
  const { fixture } = CHIPS[chipId];
  const site = fixture.location;
  const osm = makeOsmCatalog();
  const nearby = await osm.listNearbyTenants(site.latitude, site.longitude, RADIUS_KM, 24);
  const pitches = pitchEntityIdsFromFixture(fixture);
  const bucket = manifest[chipId] ?? {};

  console.log(`\n[${chipId}] nearby=${nearby.length} pitches=${pitches.length}`);

  for (const pitchEntityId of pitches) {
    const incumbentIds = incumbentEntityIdsForCoAffinity(nearby, pitchEntityId);
    if (incumbentIds.length === 0) {
      console.log('  skip', pitchEntityId, '(no incumbents)');
      continue;
    }
    const cacheKey = await coTenancyFixtureKey(pitchEntityId, incumbentIds);
    if (bucket[cacheKey]) {
      console.log('  keep', pitchEntityId, cacheKey.slice(0, 48) + '...');
      continue;
    }
    console.log('  fetch', pitchEntityId, 'incumbents', incumbentIds.length);
    const body = await fetchCoAffinity(site, pitchEntityId, incumbentIds);
    bucket[cacheKey] = body;
    await new Promise((r) => setTimeout(r, 350));
  }

  manifest[chipId] = bucket;
}

async function main() {
  if (!key) {
    console.error('Set QLOO_API_KEY to record co-tenancy fixtures (no mock replay).');
    process.exit(1);
  }

  const selected = process.argv.slice(2).filter((a) => a in CHIPS);
  const chipIds = selected.length > 0 ? selected : Object.keys(CHIPS);
  const manifest = loadManifest();

  for (const chipId of chipIds) {
    await recordChip(chipId, manifest);
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('\nWrote', manifestPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
