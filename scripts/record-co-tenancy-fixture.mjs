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
 * Writes apps/worker/public/co-tenancy/recorded.json (served via ASSETS, not bundled):
 * per chip { ids, entries: { key: { s: [[index into ids, share]] } } }, shares rounded
 * to 4 places. See docs/CO_TENANCY.md.
 * Keys: `${pitchEntityId}:${sha256(incumbents)}` (see coTenancyFixtureKey in worker).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
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
const manifestPath = join(root, 'apps/worker/public/co-tenancy/recorded.json');

const {
  incumbentEntityIdsForCoAffinity,
  coTenancyFixtureKey,
  parseCoAffinityFromInsights,
  demoSharesFromChip,
} = await importWorkerModules(root, {
  incumbentEntityIdsForCoAffinity: 'apps/worker/src/lib/co-tenancy-pairing.ts',
  coTenancyFixtureKey: 'apps/worker/src/lib/co-tenancy-pairing.ts',
  parseCoAffinityFromInsights: 'apps/worker/src/lib/co-tenancy-pairing.ts',
  demoSharesFromChip: 'apps/worker/src/lib/co-tenancy-enrich.ts',
});

/** @param {Record<string, Array<{entityId: string, affinity: number}>>} byKey */
function packChip(byKey) {
  const ids = [];
  const index = new Map();
  const entries = {};
  for (const key of Object.keys(byKey).sort()) {
    entries[key] = {
      s: byKey[key].map((row) => {
        if (!index.has(row.entityId)) {
          index.set(row.entityId, ids.length);
          ids.push(row.entityId);
        }
        return [index.get(row.entityId), Math.round(row.affinity * 1e4) / 1e4];
      }),
    };
  }
  return { ids, entries };
}

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
    const previous = demoSharesFromChip(previousChip, cacheKey);
    if (previous.length > 0) {
      bucket[cacheKey] = previous;
      console.log('  keep', pack.brand.name);
      continue;
    }
    console.log('  fetch', pack.brand.name, 'incumbents', incumbentIds.length);
    const body = await fetchCoAffinity(site, pitchEntityId, incumbentIds);
    const shares = parseCoAffinityFromInsights(body, incumbentIds, pitchEntityId);
    if (shares.length === 0) {
      console.log('    no explainability shares in response; not stored');
      continue;
    }
    bucket[cacheKey] = shares;
    await new Promise((r) => setTimeout(r, 350));
  }

  manifest[chipId] = packChip(bucket);
}

async function main() {
  if (!key) {
    console.error('Set QLOO_API_KEY to record co-tenancy fixtures (no mock replay).');
    process.exit(1);
  }
  const selected = process.argv.slice(2).filter((a) => a in CHIPS);
  const chipIds = selected.length > 0 ? selected : Object.keys(CHIPS);
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  for (const chipId of chipIds) await recordChip(chipId, manifest);
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest) + '\n');
  console.log(`\nWrote ${manifestPath} (${calls} Qloo calls)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
