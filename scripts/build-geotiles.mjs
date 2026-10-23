#!/usr/bin/env node
/**
 * Split expanded store JSON into geohash-3 static tiles for Workers Assets.
 * Output: apps/worker/public/tiles/brands.json + apps/worker/public/tiles/<gh3>.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const input = join(root, 'data/brands/store-locations.expanded.min.json');
const outDir = join(root, 'apps/worker/public/tiles');
const aliasesPath = join(root, 'data/brands/display-aliases.json');

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function encodeGeohash(lat, lon, precision = 3) {
  let idx = 0;
  let bit = 0;
  let even = true;
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let hash = '';
  while (hash.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        idx = idx * 2 + 1;
        lonMin = mid;
      } else {
        idx = idx * 2;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
        latMax = mid;
      }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

const payload = JSON.parse(readFileSync(input, 'utf8'));
const aliases = existsSync(aliasesPath)
  ? JSON.parse(readFileSync(aliasesPath, 'utf8'))
  : {};

const brandIndex = new Map();
const brands = [];

for (const [brandId, row] of Object.entries(payload.data)) {
  const displayName = aliases[brandId] || aliases[row.name] || row.name;
  const index = brands.length;
  brands.push({ id: brandId, name: row.name, displayName, count: row.count });
  brandIndex.set(brandId, index);
}

const tiles = new Map();

for (const [brandId, row] of Object.entries(payload.data)) {
  const bIdx = brandIndex.get(brandId);
  for (const [lat, lon] of row.locations) {
    const gh = encodeGeohash(lat, lon, 3);
    if (!tiles.has(gh)) tiles.set(gh, []);
    tiles.get(gh).push([bIdx, lat, lon]);
  }
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

writeFileSync(
  join(outDir, 'brands.json'),
  JSON.stringify({ generated: new Date().toISOString(), brands })
);

let totalBytes = 0;
let maxFile = 0;
for (const [gh, stores] of tiles.entries()) {
  const body = JSON.stringify({ gh, stores });
  const path = join(outDir, `${gh}.json`);
  writeFileSync(path, body);
  const size = body.length;
  totalBytes += size;
  if (size > maxFile) maxFile = size;
}

const tileFiles = readdirSync(outDir).filter((f) => f.endsWith('.json') && f !== 'brands.json');
console.log(
  JSON.stringify(
    {
      tileCount: tileFiles.length,
      totalFiles: tileFiles.length + 1,
      totalBytes,
      maxTileBytes: maxFile,
      brands: brands.length,
      points: payload.totalLocations,
      under25MiBPerFile: maxFile < 25 * 1024 * 1024,
      under20kFiles: tileFiles.length < 20000,
    },
    null,
    2
  )
);
