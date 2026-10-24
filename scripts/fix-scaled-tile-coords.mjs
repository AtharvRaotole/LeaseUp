#!/usr/bin/env node
/** Remove mistaken lat5-scaled rows (|lat|>90) from geotile JSON files. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirs = [
  join(root, 'apps/worker/public/tiles'),
  join(root, 'apps/worker/public/osm-tiles'),
  join(root, 'data/osm-snapshot/tiles'),
];

for (const dir of dirs) {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json') || file === 'brands.json') continue;
    const path = join(dir, file);
    const tile = JSON.parse(readFileSync(path, 'utf8'));
    if (!tile.stores) continue;
    const before = tile.stores.length;
    tile.stores = tile.stores.filter(([, lat]) => Math.abs(lat) <= 90);
    if (tile.stores.length !== before) {
      writeFileSync(path, JSON.stringify(tile));
      console.log(JSON.stringify({ fixed: path, removed: before - tile.stores.length }));
    }
  }
}
