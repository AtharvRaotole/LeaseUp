import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const path = join(dirname(fileURLToPath(import.meta.url)), '../build-osm-snapshot.mjs');
const src = readFileSync(path, 'utf8');

if (src.includes('* 1e5') || src.includes('lat5')) {
  console.error('build-osm-snapshot.mjs must write decimal degree coordinates, not lat*1e5 micro-degrees.');
  process.exit(1);
}

console.log('OSM snapshot tile coord guard OK.');
