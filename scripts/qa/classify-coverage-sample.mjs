#!/usr/bin/env node
/** Sample random coverage mismatches; bucket with same rules as store-coverage-audit.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTileCatalog, haversineKm } from './store-tile-geo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const RADIUS_KM = 10;
const SAMPLE = 20;
const SEED = 728;

const sites = [
  { id: 'wicker', label: 'Wicker Park', lat: 41.9088, lon: -87.6776 },
  { id: 'boulder', label: 'Boulder Pearl', lat: 40.015, lon: -105.2705 },
  { id: 'sevierville', label: 'Sevierville', lat: 35.8681, lon: -83.5618 },
  { id: 'bleecker', label: '350 Bleecker', lat: 40.73352, lon: -74.00271 },
  { id: 'pearl1600', label: '1600 Pearl', lat: 40.01739, lon: -105.27727 },
];

const tracked = [];
for (const line of readFileSync(join(ROOT, 'apps/worker/src/data/tracked-brand-ids.ts'), 'utf8').split('\n')) {
  const m = line.match(/"([0-9A-F-]{36})"/i);
  if (m) tracked.push(m[1]);
}

const atpExpanded = JSON.parse(
  readFileSync(join(ROOT, 'data/brands/store-locations.expanded.min.json'), 'utf8')
).data;
const osmDir = join(ROOT, 'data/osm-snapshot/tiles');
const osm = loadTileCatalog(osmDir);
const osmBrands = JSON.parse(readFileSync(join(osmDir, 'brands.json'), 'utf8')).brands;
const osmUsableIds = new Set(osmBrands.filter((b) => (b.count ?? 0) > 0).map((b) => b.id));

function nearestAtpAnyKm(brandId, lat, lon) {
  const row = atpExpanded[brandId];
  let nearest = Infinity;
  for (const [tLat, tLon] of row?.locations ?? []) {
    const d = haversineKm(lat, lon, tLat, tLon);
    if (d < nearest) nearest = d;
  }
  return nearest === Infinity ? undefined : nearest;
}

function nearestAtpKm(brandId, lat, lon, radiusKm) {
  const d = nearestAtpAnyKm(brandId, lat, lon);
  return d !== undefined && d <= radiusKm ? d : undefined;
}

function classifyAtSite(brandId, site, atpIn, osmIn, atpKm, osmKm, risk) {
  if (!osmUsableIds.has(brandId)) return 'osm_snapshot_gap';
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

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mismatches = [];
for (const site of sites) {
  for (const brandId of tracked) {
    const atpKm = nearestAtpKm(brandId, site.lat, site.lon, RADIUS_KM);
    const osmKm = osm.nearestStoreKm(brandId, site.lat, site.lon, RADIUS_KM);
    const atpIn = atpKm !== undefined;
    const osmIn = osmKm !== undefined;
    if (atpIn === osmIn) continue;
    const name = atpExpanded[brandId]?.name ?? brandId;
    const risk = atpIn ? 'osm_false_absence' : 'atp_false_absence';
    const bucket = classifyAtSite(brandId, site, atpIn, osmIn, atpKm, osmKm, risk);
    mismatches.push({
      site: site.label,
      brandId,
      name,
      risk,
      bucket,
      atpKm,
      osmKm,
      atpNearestKm: nearestAtpAnyKm(brandId, site.lat, site.lon),
      osmUsable: osmUsableIds.has(brandId),
    });
  }
}

const rng = mulberry32(SEED);
const sample = [...mismatches].sort(() => rng() - 0.5).slice(0, SAMPLE);

const bucketCounts = {};
for (const m of mismatches) {
  bucketCounts[m.bucket] = (bucketCounts[m.bucket] ?? 0) + 1;
}

mkdirSync(join(ROOT, 'data/qa'), { recursive: true });
const outPath = join(ROOT, 'data/qa/coverage-mismatch-sample.json');
writeFileSync(outPath, JSON.stringify({ totalMismatches: mismatches.length, bucketCounts, sample }, null, 2));

let md = '| Site | Brand | Risk | Bucket | ATP km | OSM km | ATP nearest km |\n|---|---|---|---|---:|---:|---:|\n';
for (const row of sample) {
  md += `| ${row.site} | ${row.name} | ${row.risk} | ${row.bucket} | ${row.atpKm?.toFixed(2) ?? '-'} | ${row.osmKm?.toFixed(2) ?? '-'} | ${row.atpNearestKm?.toFixed(2) ?? '-'} |\n`;
}
writeFileSync(join(ROOT, 'data/qa/coverage-mismatch-sample.md'), md);
console.log(JSON.stringify({ bucketCounts, sampleCount: sample.length }, null, 2));
