#!/usr/bin/env node
/**
 * Generate chunked SQL seed files for D1 store catalog.
 * Usage: node scripts/seed-d1.mjs [--input data/brands/store-locations.expanded.min.json] [--out data/d1-seed]
 * Apply: wrangler d1 execute leaseup_db --local --file=data/d1-seed/001-brands.sql
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const input =
  process.argv.includes('--input')
    ? process.argv[process.argv.indexOf('--input') + 1]
    : join(process.cwd(), 'data/brands/store-locations.expanded.min.json');
const outDir =
  process.argv.includes('--out')
    ? process.argv[process.argv.indexOf('--out') + 1]
    : join(process.cwd(), 'data/d1-seed');

const payload = JSON.parse(readFileSync(input, 'utf8'));
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const brandLines = ['DELETE FROM brands;', 'DELETE FROM stores;'];
for (const [brandId, row] of Object.entries(payload.data)) {
  const name = row.name.replace(/'/g, "''");
  brandLines.push(
    `INSERT INTO brands (brand_id, name, store_count) VALUES ('${brandId}', '${name}', ${row.count});`
  );
}
writeFileSync(join(outDir, '001-brands.sql'), brandLines.join('\n'));

const CHUNK = 8000;
let chunkIndex = 2;
let storeLines = [];
let inChunk = 0;

for (const [brandId, row] of Object.entries(payload.data)) {
  for (const [lat, lon] of row.locations) {
    storeLines.push(`INSERT INTO stores (brand_id, lat, lon) VALUES ('${brandId}', ${lat}, ${lon});`);
    inChunk++;
    if (inChunk >= CHUNK) {
      writeFileSync(join(outDir, `${String(chunkIndex).padStart(3, '0')}-stores.sql`), storeLines.join('\n'));
      chunkIndex++;
      storeLines = [];
      inChunk = 0;
    }
  }
}

if (storeLines.length > 0) {
  writeFileSync(join(outDir, `${String(chunkIndex).padStart(3, '0')}-stores.sql`), storeLines.join('\n'));
}

console.log(`Wrote D1 seed SQL to ${outDir} (${payload.brands} brands, ${payload.totalLocations} locations)`);
