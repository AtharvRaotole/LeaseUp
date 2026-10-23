/**
 * Record brand-reverse heatmap fixtures from the live Qloo API.
 * Usage: QLOO_API_KEY=... node scripts/record-brand-reverse-fixture.mjs [metroId ...]
 * Writes packages/fixtures/src/brand-reverse/<metro>.json with provenance (no key stored).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const key = process.env.QLOO_API_KEY;
if (!key) {
  console.error('Set QLOO_API_KEY');
  process.exit(1);
}
const baseUrl = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';
const brandId = process.env.BRAND_ID || '54617D9D-5EC7-45E0-8B7F-360DADB0FE7E';

// Mirrors apps/worker/src/data/metros.ts
const METROS = {
  chicago: { latitude: 41.8781, longitude: -87.6298, radiusKm: 35 },
  denver: { latitude: 39.7392, longitude: -104.9903, radiusKm: 30 },
  austin: { latitude: 30.2672, longitude: -97.7431, radiusKm: 30 },
};
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['chicago', 'denver', 'austin'];
const outDir = join(process.cwd(), 'packages/fixtures/src/brand-reverse');
mkdirSync(outDir, { recursive: true });

for (const metroId of targets) {
  const m = METROS[metroId];
  if (!m) throw new Error(`Unknown metro ${metroId}`);
  const params = {
    'filter.type': 'urn:heatmap',
    'filter.location': `POINT(${m.longitude} ${m.latitude})`,
    'filter.location.radius': String(Math.round(m.radiusKm * 1000)),
    'signal.interests.entities': brandId,
  };
  const url = new URL('/v2/insights', baseUrl);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const recordedAt = new Date().toISOString();
  const res = await fetch(url, { headers: { 'X-Api-Key': key, Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok) {
    console.error(metroId, 'Qloo error', res.status, text.slice(0, 300));
    process.exit(1);
  }
  const data = JSON.parse(text);
  const raw = data.results?.heatmap ?? [];
  const cells = raw.map((c) => ({
    latitude: c.location.latitude,
    longitude: c.location.longitude,
    geohash: c.location.geohash,
    affinity_rank: c.query.affinity_rank,
    affinity: c.query.affinity,
    popularity: c.query.popularity,
  }));
  const fixture = {
    brandEntityId: brandId,
    metroId,
    source: 'heatmap',
    sourceNote: `Recorded Qloo heatmap (${cells.length} cells) captured ${recordedAt.slice(0, 10)}.`,
    provenance: {
      recordedAt,
      host: baseUrl,
      method: 'GET',
      path: '/v2/insights',
      params,
      httpStatus: res.status,
      rawCellCount: raw.length,
      note: 'API key stripped. Cells are the unmodified results.heatmap array, field-renamed only.',
    },
    cells,
  };
  writeFileSync(join(outDir, `${metroId}.json`), JSON.stringify(fixture, null, 1) + '\n');
  console.log('Wrote', metroId, 'cells:', cells.length);
}
