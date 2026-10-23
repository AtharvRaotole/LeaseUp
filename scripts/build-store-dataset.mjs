/**
 * Build compact brand store dataset from All The Places (CC0).
 * Splits multi-brand spiders by each feature's brand/name tag.
 *
 * Usage:
 *   node scripts/build-store-dataset.mjs \
 *     --atp-dir path/to/atp/geojson \
 *     --brands data/brands/brands_expanded.json \
 *     --plan data/brands/atp_plan.json \
 *     --output data/brands/store-locations.expanded.min.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

function parseArgs(argv) {
  const args = {
    atpDir: 'data/atp',
    brands: 'data/brands/brands_expanded.json',
    plan: 'data/brands/atp_plan.json',
    output: 'data/brands/store-locations.expanded.min.json',
  };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--atp-dir' && value) {
      args.atpDir = value;
      i++;
    } else if (flag === '--brands' && value) {
      args.brands = value;
      i++;
    } else if (flag === '--plan' && value) {
      args.plan = value;
      i++;
    } else if (flag === '--output' && value) {
      args.output = value;
      i++;
    }
  }
  return args;
}

function norm(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function featureBrandKey(props, expectedName) {
  const candidates = [props?.brand, props?.name, props?.['brand:name']].filter(Boolean);
  const expected = norm(expectedName);
  for (const c of candidates) {
    if (norm(c) === expected || norm(c).includes(expected) || expected.includes(norm(c))) {
      return norm(c);
    }
  }
  return norm(candidates[0] || expectedName);
}

const paths = parseArgs(process.argv);
const brands = JSON.parse(readFileSync(paths.brands, 'utf8'));
const plan = JSON.parse(readFileSync(paths.plan, 'utf8'));
const storeData = {};
let totalStores = 0;

for (const [slug, brandInfo] of Object.entries(brands)) {
  const planRow = plan[brandInfo.name];
  const spider = planRow?.spider || slug;
  const geojsonPath = join(paths.atpDir, `${spider}.geojson`);
  if (!existsSync(geojsonPath)) {
    console.warn(`Missing geojson for ${brandInfo.name} (${geojsonPath})`);
    continue;
  }

  const geojson = JSON.parse(readFileSync(geojsonPath, 'utf8'));
  const locations = [];
  const multi = planRow?.multi_brand_spider === true;

  for (const feature of geojson.features || []) {
    if (!feature.geometry || feature.geometry.type !== 'Point') continue;
    const [lon, lat] = feature.geometry.coordinates;
    if (lat <= 18 || lat >= 72 || lon <= -175 || lon >= -65) continue;

    if (multi) {
      const key = featureBrandKey(feature.properties || {}, brandInfo.name);
      if (key !== norm(brandInfo.name) && !key.includes(norm(brandInfo.name))) {
        continue;
      }
    }

    locations.push([Number(lat.toFixed(3)), Number(lon.toFixed(3))]);
  }

  if (locations.length > 0) {
    storeData[brandInfo.id] = {
      name: brandInfo.name,
      slug,
      count: locations.length,
      locations,
    };
    totalStores += locations.length;
  }
}

const output = {
  source: 'All The Places',
  license: 'CC0',
  url: 'https://alltheplaces-data.openaddresses.io/runs/2026-10-10-13-32-41/',
  generated: new Date().toISOString(),
  brands: Object.keys(storeData).length,
  totalLocations: totalStores,
  data: storeData,
};

writeFileSync(paths.output, JSON.stringify(output));
console.log(`Built ${output.brands} brands, ${totalStores} locations -> ${paths.output}`);
