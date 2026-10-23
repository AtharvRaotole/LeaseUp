#!/usr/bin/env node
/**
 * Merge data/store-location-supplements.json into ATP and OSM geotile trees.
 * Run after build-osm-snapshot or when supplements change (local VM only).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const supplementsPath = join(root, 'data/store-location-supplements.json');

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

function haversineM(lat1, lon1, lat2, lon2) {
  const r = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function loadSupplements() {
  const raw = JSON.parse(readFileSync(supplementsPath, 'utf8'));
  return raw.stores ?? [];
}

function applyToTree(tilesDir, supplements) {
  if (!existsSync(tilesDir)) {
    console.log(JSON.stringify({ event: 'store_supplements_skip', tilesDir }));
    return { added: 0 };
  }
  const brandsPath = join(tilesDir, 'brands.json');
  const brandsDoc = JSON.parse(readFileSync(brandsPath, 'utf8'));
  const brands = brandsDoc.brands;
  let added = 0;

  for (const row of supplements) {
    const brandIdx = brands.findIndex((b) => b.id === row.brandId);
    if (brandIdx < 0) {
      console.warn(JSON.stringify({ event: 'store_supplement_unknown_brand', brandId: row.brandId }));
      continue;
    }
    const gh = encodeGeohash(row.lat, row.lon, 3);
    const tilePath = join(tilesDir, `${gh}.json`);
    let tile = { gh, stores: [] };
    if (existsSync(tilePath)) {
      tile = JSON.parse(readFileSync(tilePath, 'utf8'));
    }
    const dup = tile.stores.some(([bIdx, tLat, tLon]) => {
      if (bIdx !== brandIdx) return false;
      const lat = Math.abs(tLat) > 90 ? tLat / 1e5 : tLat;
      const lon = Math.abs(tLon) > 180 ? tLon / 1e5 : tLon;
      return haversineM(row.lat, row.lon, lat, lon) < 25;
    });
    if (dup) continue;
    tile.stores.push([brandIdx, row.lat, row.lon]);
    writeFileSync(tilePath, JSON.stringify(tile));
    brands[brandIdx].count = (brands[brandIdx].count ?? 0) + 1;
    added += 1;
    console.log(
      JSON.stringify({
        event: 'store_supplement_added',
        tilesDir,
        brandId: row.brandId,
        gh,
        source: row.source,
      })
    );
  }

  writeFileSync(brandsPath, JSON.stringify(brandsDoc));
  return { added };
}

const supplements = loadSupplements();
const atp = applyToTree(join(root, 'apps/worker/public/tiles'), supplements);
const osm = applyToTree(join(root, 'apps/worker/public/osm-tiles'), supplements);
const osmData = applyToTree(join(root, 'data/osm-snapshot/tiles'), supplements);
console.log(JSON.stringify({ atp, osm, osmData }));
