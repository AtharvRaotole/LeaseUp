/**
 * Record Qloo co-tenancy insights for demo mode.
 *
 * Pitches and incumbents come from the local demo worker so fixture keys match
 * exactly what the report requests (top 10 prospects x nearest OSM incumbents):
 *
 *   pnpm --filter @leaseup/fixtures build && pnpm --filter @leaseup/worker build
 *   (cd apps/worker && wrangler dev --local --port 8787)   # APP_MODE=demo
 *   QLOO_API_KEY=... node scripts/record-co-tenancy-fixture.mjs wicker boulder sevierville
 *
 * Stores only the per-incumbent explainability shares for each pitched brand, packed
 * per chip (incumbent id table + [index, score] pairs, scores rounded to 4 places) to
 * keep the worker bundle small. See packCoTenancyChip in packages/fixtures.
 * Keys: `${pitchEntityId}:${sha256(incumbents)}` (see coTenancyFixtureKey in worker).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { importWorkerModules } from './lib-worker-bundle.mjs';

const key = process.env.QLOO_API_KEY;
const baseUrl = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';
const apiUrl = process.env.LEASEUP_API_URL || 'http://localhost:8787';
const RADIUS_KM = Number(process.env.LEASEUP_DEMO_RADIUS_KM || '10');
const MAX_PITCHES = 10;

const CHIPS = {
  wicker: '1574 N Milwaukee Ave, Chicago, IL 60622',
  boulder: '1125 Pearl St, Boulder, CO 80302',
  sevierville: '125 Collier Dr, Sevierville, TN 37862',
};

const root = process.cwd();
const manifestPath = join(root, 'packages/fixtures/src/co-tenancy-recorded/manifest.json');

const {
  incumbentEntityIdsForCoAffinity,
  coTenancyFixtureKey,
  compactCoTenancyInsights,
  packCoTenancyChip,
  unpackCoTenancyEntry,
} = await importWorkerModules(root, {
  incumbentEntityIdsForCoAffinity: 'apps/worker/src/lib/co-tenancy-pairing.ts',
  coTenancyFixtureKey: 'apps/worker/src/lib/co-tenancy-pairing.ts',
  compactCoTenancyInsights: 'apps/worker/src/lib/co-tenancy-pairing.ts',
  packCoTenancyChip: 'packages/fixtures/src/co-tenancy-recorded-loader.ts',
  unpackCoTenancyEntry: 'packages/fixtures/src/co-tenancy-recorded-loader.ts',
});

let calls = 0;

async function fetchCoAffinity(site, pitchEntityId, incumbentEntityIds) {
  const url = new URL('/v2/insights', baseUrl);
  url.searchParams.set('filter.type', 'urn:entity:brand');
  url.searchParams.set('filter.results.entities', pitchEntityId);
  url.searchParams.set('signal.location', `POINT(${site.longitude} ${site.latitude})`);
  url.searchParams.set('signal.location.radius', String(Math.round(RADIUS_KM * 1000)));
  url.searchParams.set('signal.interests.entities', incumbentEntityIds.join(','));
  url.searchParams.set('take', '1');
  url.searchParams.set('feature.explainability', 'true');

  calls += 1;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'X-Api-Key': key } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Qloo co-tenancy ${res.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text);
}

async function demoAnalysis(address) {
  const res = await fetch(new URL('/api/analyze', apiUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address, radius: RADIUS_KM }),
  });
  if (!res.ok) throw new Error(`demo analyze ${res.status} at ${apiUrl}`);
  return res.json();
}

async function recordChip(chipId, manifest) {
  const analysis = await demoAnalysis(CHIPS[chipId]);
  const site = analysis.location;
  const nearby = analysis.nearbyTenants ?? [];
  const pitches = (analysis.prospects ?? []).slice(0, MAX_PITCHES);
  const bucket = {};
  const previousChip = manifest[chipId] ?? { ids: [], entries: {} };

  console.log(`\n[${chipId}] nearby=${nearby.length} pitches=${pitches.length}`);

  for (const pack of pitches) {
    const pitchEntityId = pack.brand.entityId;
    const incumbentIds = incumbentEntityIdsForCoAffinity(nearby, pitchEntityId);
    if (incumbentIds.length === 0) {
      console.log('  skip', pack.brand.name, '(no incumbents)');
      continue;
    }
    const cacheKey = await coTenancyFixtureKey(pitchEntityId, incumbentIds);
    const previous = unpackCoTenancyEntry(previousChip, cacheKey);
    if (previous) {
      bucket[cacheKey] = previous;
      console.log('  keep', pack.brand.name);
      continue;
    }
    console.log('  fetch', pack.brand.name, 'incumbents', incumbentIds.length);
    const body = await fetchCoAffinity(site, pitchEntityId, incumbentIds);
    const compact = compactCoTenancyInsights(body, pitchEntityId);
    if (!compact) {
      console.log('    no pitch row in response; not stored');
      continue;
    }
    bucket[cacheKey] = compact;
    await new Promise((r) => setTimeout(r, 350));
  }

  manifest[chipId] = packCoTenancyChip(bucket);
}

async function main() {
  if (!key) {
    console.error('Set QLOO_API_KEY to record co-tenancy fixtures (no mock replay).');
    process.exit(1);
  }
  const selected = process.argv.slice(2).filter((a) => a in CHIPS);
  const chipIds = selected.length > 0 ? selected : Object.keys(CHIPS);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const chipId of chipIds) await recordChip(chipId, manifest);
  writeFileSync(manifestPath, JSON.stringify(manifest) + '\n');
  console.log(`\nWrote ${manifestPath} (${calls} Qloo calls)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
