/**
 * Build a compact brand-to-store-locations dataset from All The Places data
 * Source: https://alltheplaces-data.openaddresses.io/ (CC0 license)
 * Run: cd /workspace && node scripts/build-store-dataset.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ATP_DIR = '/home/ubuntu/.cursor/projects/workspace/uploads/round2/atp';
const BRANDS_FILE = '/home/ubuntu/.cursor/projects/workspace/uploads/round2/brands_all.json';
const OUTPUT_FILE = join(process.cwd(), 'packages/fixtures/src/store-locations.json');

const brands = JSON.parse(readFileSync(BRANDS_FILE, 'utf8'));
const storeData = {};
let totalStores = 0;

for (const [filename, brandInfo] of Object.entries(brands)) {
  const geojsonPath = join(ATP_DIR, `${filename}.geojson`);
  
  try {
    const geojson = JSON.parse(readFileSync(geojsonPath, 'utf8'));
    const locations = [];
    
    for (const feature of geojson.features || []) {
      if (feature.geometry && feature.geometry.type === 'Point') {
        const [lon, lat] = feature.geometry.coordinates;
        if (lat > 18 && lat < 72 && lon > -175 && lon < -65) {
          locations.push([lat, lon]);
        }
      }
    }
    
    if (locations.length > 0) {
      storeData[brandInfo.id] = {
        name: brandInfo.name,
        slug: filename,
        count: locations.length,
        locations: locations,
      };
      totalStores += locations.length;
    }
  } catch (err) {
    console.warn(`Skipping ${filename}: ${err.message}`);
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

writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

console.log(`Built store dataset: ${Object.keys(storeData).length} brands, ${totalStores} locations`);
console.log(`Output: ${OUTPUT_FILE}`);
