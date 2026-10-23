import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const raw = JSON.parse(readFileSync(join(root, 'data/brands/osm-wikidata.json'), 'utf8'));
const map = Object.fromEntries(
  Object.entries(raw).filter(([k]) => !k.startsWith('comment'))
);

const out = join(root, 'apps/worker/src/data/osm-wikidata-map.ts');
writeFileSync(
  out,
  `/** Generated from data/brands/osm-wikidata.json */
export const OSM_WIKIDATA_BY_ENTITY: Record<string, string> = ${JSON.stringify(map, null, 2)};
`
);
console.log(`Wrote ${Object.keys(map).length} wikidata hints`);
