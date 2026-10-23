#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'data/osm-snapshot/tiles');
const dest = join(root, 'apps/worker/public/osm-tiles');

if (!existsSync(join(src, 'brands.json'))) {
  console.log('No OSM snapshot tiles found; skip copy');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  if (!file.endsWith('.json')) continue;
  copyFileSync(join(src, file), join(dest, file));
}
console.log(`Copied OSM tiles to ${dest}`);
