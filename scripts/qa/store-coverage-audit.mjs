#!/usr/bin/env node
/**
 * Offline ATP vs OSM snapshot coverage audit for demo sites.
 * Writes docs/qa/store-coverage-audit.md
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTileCatalog } from './store-tile-geo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const AUDIT_SITES = [
  { id: 'wicker', label: 'Wicker Park demo chip', address: '1560 N Milwaukee Ave, Chicago, IL 60622', lat: 41.9088, lon: -87.6776 },
  { id: 'boulder', label: 'Boulder demo chip', address: '1300 Pearl St, Boulder, CO 80302', lat: 40.015, lon: -105.2705 },
  { id: 'sevierville', label: 'Sevierville demo chip', address: '125 Collier Dr, Sevierville, TN 37862', lat: 35.8681, lon: -83.5618 },
  { id: 'bleecker', label: '350 Bleecker St', address: '350 Bleecker St, New York, NY 10014', lat: 40.73352, lon: -74.00271 },
  { id: 'pearl1600', label: '1600 Pearl St Boulder', address: '1600 Pearl St, Boulder, CO 80302', lat: 40.01739, lon: -105.27727 },
];

const RADIUS_KM = Number(process.env.COVERAGE_AUDIT_RADIUS_KM || '10');
const outPath = join(ROOT, 'docs/qa/store-coverage-audit.md');

const trackedPath = join(ROOT, 'apps/worker/src/data/tracked-brand-ids.ts');
const tracked = [];
for (const line of readFileSync(trackedPath, 'utf8').split('\n')) {
  const m = line.match(/"([0-9A-F-]{36})"/i);
  if (m) tracked.push(m[1]);
}

const atpExpanded = JSON.parse(
  readFileSync(join(ROOT, 'data/brands/store-locations.expanded.min.json'), 'utf8')
).data;

const supplements = JSON.parse(
  readFileSync(join(ROOT, 'data/store-location-supplements.json'), 'utf8')
).stores ?? [];

const osmTilesDir = join(ROOT, 'data/osm-snapshot/tiles');
const osm = loadTileCatalog(osmTilesDir);
const osmBrandsDoc = JSON.parse(readFileSync(join(osmTilesDir, 'brands.json'), 'utf8'));
const osmZeroIds = new Set(
  (osmBrandsDoc.brands ?? []).filter((b) => (b.count ?? 0) <= 0).map((b) => b.id)
);
const osmUsableIds = new Set(
  (osmBrandsDoc.brands ?? []).filter((b) => (b.count ?? 0) > 0).map((b) => b.id)
);
const osmSnapshotBrandIds = new Set((osmBrandsDoc.brands ?? []).map((b) => b.id));

function nearestAtpAnyKm(brandId, lat, lon) {
  const row = atpExpanded[brandId];
  let nearest = Infinity;
  if (row?.locations?.length) {
    for (const [tLat, tLon] of row.locations) {
      const d = haversineKm(lat, lon, tLat, tLon);
      if (d < nearest) nearest = d;
    }
  }
  return nearest === Infinity ? undefined : nearest;
}

function classifyMismatchAtSite(brandId, site, atpIn, osmIn, atpKm, osmKm, risk) {
  if (!osmUsableIds.has(brandId)) {
    return 'osm_snapshot_gap';
  }
  const atpNearest = nearestAtpAnyKm(brandId, site.lat, site.lon);
  if (risk === 'osm_false_absence') {
    if (atpNearest !== undefined && atpNearest > RADIUS_KM && atpNearest <= RADIUS_KM + 1.25) {
      return 'radius_edge';
    }
    return 'osm_gap';
  }
  if (risk === 'atp_false_absence') {
    if (osmKm !== undefined && osmKm > RADIUS_KM - 1.25 && osmKm <= RADIUS_KM) {
      return 'radius_edge';
    }
    return 'atp_gap';
  }
  return 'unknown';
}

function nearestAtpKm(brandId, lat, lon, radiusKm) {
  const row = atpExpanded[brandId];
  let nearest = Infinity;
  if (row?.locations?.length) {
    for (const [tLat, tLon] of row.locations) {
      const d = haversineKm(lat, lon, tLat, tLon);
      if (d <= radiusKm && d < nearest) nearest = d;
    }
  }
  for (const sup of supplements) {
    if (sup.brandId !== brandId) continue;
    const targets = sup.targets ?? ['atp', 'osm', 'osmData'];
    if (!targets.includes('atp')) continue;
    const d = haversineKm(lat, lon, sup.lat, sup.lon);
    if (d <= radiusKm && d < nearest) nearest = d;
  }
  return nearest === Infinity ? undefined : nearest;
}

function haversineKm(lat1, lon1, lat2, lon2) {
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

const siteReports = [];
let totalMismatches = 0;
const bucketTotals = {
  osm_snapshot_gap: 0,
  osm_gap: 0,
  atp_gap: 0,
  radius_edge: 0,
  unknown: 0,
};

for (const site of AUDIT_SITES) {
  const mismatches = [];
  for (const brandId of tracked) {
    const atpKm = nearestAtpKm(brandId, site.lat, site.lon, RADIUS_KM);
    const osmKm = osm.nearestStoreKm(brandId, site.lat, site.lon, RADIUS_KM);
    const atpIn = atpKm !== undefined;
    const osmIn = osmKm !== undefined;
    if (atpIn === osmIn) continue;
    const name = atpExpanded[brandId]?.name ?? osm.brands.find((b) => b.id === brandId)?.name ?? brandId;
    const risk = atpIn ? 'osm_false_absence' : 'atp_false_absence';
    const bucket = classifyMismatchAtSite(brandId, site, atpIn, osmIn, atpKm, osmKm, risk);
    bucketTotals[bucket] = (bucketTotals[bucket] ?? 0) + 1;
    mismatches.push({
      brandId,
      name,
      atpKm,
      osmKm,
      risk,
      bucket,
    });
  }
  totalMismatches += mismatches.length;
  siteReports.push({ site, mismatches });
}

const generatedAt = new Date().toISOString();
const lines = [
  '# Store coverage audit (ATP vs OSM snapshot)',
  '',
  `Generated: ${generatedAt}`,
  '',
  `Radius: **${RADIUS_KM} km** per site. Brands scanned: **${tracked.length}** (tracked chains).`,
  '',
  '## Why REI SoHo was missing from OSM tiles (fixed)',
  '',
  '- **Not** a bbox issue: the snapshot query is US-wide `nwr["brand:wikidata"="Q3414933"](area.us)`.',
  '- **Not** missing OSM tags: [node 2483671757](https://www.openstreetmap.org/node/2483671757) has `brand=REI` and `brand:wikidata=Q3414933`.',
  '- **Root cause:** `build-osm-snapshot.mjs` wrote tile coordinates as `round(lat*1e5)` while readers expect **decimal degrees**. Rows with `|lat|>90` were removed by `fix-scaled-tile-coords.mjs`, dropping SoHo and other urban stores.',
  '- **Fix:** tiles now store `[brandIdx, lat, lon]` in degrees. Rebuild the OSM snapshot on a VM after pulling raw Overpass JSON.',
  '- **ATP:** All The Places CC0 still has no SoHo point (~32 km nearest at Bleecker). `data/store-location-supplements.json` keeps an **ATP-only** row citing the OSM node until ATP upstream updates.',
  '',
  '## Summary counts',
  '',
  `- **Total mismatches:** ${totalMismatches}`,
  `- **OSM snapshot gap** (chain not in offline OSM tiles — ATP present, OSM absent): ${bucketTotals.osm_snapshot_gap}`,
  `- **OSM gap** (both in snapshot; ATP has a store OSM misses): ${bucketTotals.osm_gap}`,
  `- **ATP gap** (OSM has a store ATP misses): ${bucketTotals.atp_gap}`,
  `- **Radius edge** (nearest store just outside ${RADIUS_KM} km in one source): ${bucketTotals.radius_edge}`,
  `- Brands with Wikidata in snapshot but 0 tiled points: ${osmZeroIds.size}`,
  `- Brands in OSM snapshot index: ${osmSnapshotBrandIds.size} / ${tracked.length} tracked`,
  '',
  '### Hand review sample (n=20, seed 728)',
  '',
  (() => {
    try {
      const sampleDoc = JSON.parse(
        readFileSync(join(ROOT, 'data/qa/coverage-mismatch-sample.json'), 'utf8')
      );
      const counts = {};
      for (const row of sampleDoc.sample ?? []) {
        counts[row.bucket] = (counts[row.bucket] ?? 0) + 1;
      }
      const parts = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `\`${k}\` ${n}/20`);
      return `Spot-check of 20 random mismatches (same buckets as above): ${parts.join(', ')}. No Wikidata tag-matching bugs found in this draw; remaining \`osm_gap\` / \`atp_gap\` rows are incomplete source coverage or metro sparsity, not coordinate or brand-matcher errors.`;
    } catch {
      return 'Run `node scripts/qa/classify-coverage-sample.mjs` before the audit.';
    }
  })(),
  '',
  (() => {
    try {
      return readFileSync(join(ROOT, 'data/qa/coverage-mismatch-sample.md'), 'utf8');
    } catch {
      return '_Run `node scripts/qa/classify-coverage-sample.mjs` first._\n';
    }
  })(),
  '',
  '| Site | All mismatches | OSM snapshot gap | OSM gap | ATP gap | Radius edge |',
  '|------|----------------|------------------|---------|---------|-------------|',
];

for (const { site, mismatches } of siteReports) {
  const b = (k) => mismatches.filter((m) => m.bucket === k).length;
  lines.push(
    `| ${site.label} | ${mismatches.length} | ${b('osm_snapshot_gap')} | ${b('osm_gap')} | ${b('atp_gap')} | ${b('radius_edge')} |`
  );
}
lines.push('');

for (const { site, mismatches } of siteReports) {
  lines.push(`## ${site.label}`);
  lines.push('');
  lines.push(`Address: \`${site.address}\` (${site.lat}, ${site.lon})`);
  lines.push('');
  if (mismatches.length === 0) {
    lines.push('No ATP/OSM radius mismatches for tracked brands.');
    lines.push('');
    continue;
  }
  lines.push('| Brand | Risk | ATP nearest km | OSM nearest km |');
  lines.push('|-------|------|----------------|----------------|');
  for (const row of mismatches.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(
      `| ${row.name} | ${row.risk} | ${row.atpKm?.toFixed(2) ?? '-'} | ${row.osmKm?.toFixed(2) ?? '-'} |`
    );
  }
  lines.push('');
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${outPath} (${totalMismatches} mismatches)`);
