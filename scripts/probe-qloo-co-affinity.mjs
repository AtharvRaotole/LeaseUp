/**
 * Verify Qloo co-tenancy insights params (one live call).
 *
 *   QLOO_API_KEY=... node scripts/probe-qloo-co-affinity.mjs
 *
 * Uses Wicker Park pin, a pitched brand, and comma-separated incumbent entity IDs
 * on signal.interests.entities (same shape as apps/worker getBrandCoAffinityWithIncumbents).
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const key = process.env.QLOO_API_KEY;
const baseUrl = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';

const { wickerparkFixture } = require('../packages/fixtures/dist/wicker-park.js');

/** Vans (demo pitch for Wicker in explainability fixtures). */
const PITCH_ENTITY_ID = 'AC8F9047-F23D-4A54-BBAA-A3CBD2991C02';

/** Sample incumbents from Wicker 10 km OSM snapshot (ok brands). */
const SAMPLE_INCUMBENTS = [
  'B13C02E3-BA3C-4B39-85B4-ACF12FEBC892',
  '1E5D90F5-5E0D-4486-B651-D0E7B8A6BE23',
  '2C5054E1-8691-4F52-83CD-310D029BA6A3',
];

const RADIUS_KM = Number(process.env.LEASEUP_PROBE_RADIUS_KM || '10');

function formatWktPoint(lon, lat) {
  return `POINT(${lon} ${lat})`;
}

async function main() {
  if (!key) {
    console.error('Set QLOO_API_KEY to probe co-affinity (one live /v2/insights call).');
    process.exit(1);
  }

  const { latitude, longitude } = wickerparkFixture.location;
  const url = new URL('/v2/insights', baseUrl);
  url.searchParams.set('filter.type', 'urn:entity:brand');
  url.searchParams.set('filter.results.entities', PITCH_ENTITY_ID);
  url.searchParams.set('signal.location', formatWktPoint(longitude, latitude));
  url.searchParams.set('signal.location.radius', String(Math.round(RADIUS_KM * 1000)));
  url.searchParams.set('signal.interests.entities', SAMPLE_INCUMBENTS.join(','));
  url.searchParams.set('take', '1');
  url.searchParams.set('feature.explainability', 'true');

  console.log('GET', url.toString().replace(key, '***'));

  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'X-Api-Key': key },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('HTTP', res.status, text.slice(0, 400));
    process.exit(1);
  }

  const json = JSON.parse(text);
  const entities = json?.results?.entities ?? [];
  console.log('entities returned:', entities.length, '(filter.results.entities keeps only the pitched brand)');
  const row = entities.find((e) => String(e.entity_id).toUpperCase() === PITCH_ENTITY_ID);
  if (!row) {
    console.error('Pitched brand row missing: filter.results.entities was not applied.');
    process.exit(1);
  }
  console.log(' ', row.name, 'query.affinity', row.query?.affinity, '(flat across brands, not used)');
  const explain = row.query?.explainability?.['signal.interests.entities'] ?? [];
  console.log('  explainability shares per incumbent (used for pairing):');
  for (const e of explain) console.log('   ', e.entity_id, Number(e.score).toFixed(3));
  if (explain.length === 0) {
    console.error('No per-incumbent explainability: pairing lines would be omitted.');
    process.exit(1);
  }
  console.log('OK: co-tenancy insights params accepted.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
