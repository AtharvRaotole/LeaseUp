#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resolved = JSON.parse(readFileSync(join(root, 'data/brands/resolved_brand_ids.json'), 'utf8'));
const expanded = JSON.parse(readFileSync(join(root, 'data/brands/brands_expanded.json'), 'utf8'));
const aliases = JSON.parse(readFileSync(join(root, 'data/brands/display-aliases.json'), 'utf8'));

const byId = {};
const byQlooName = {};

for (const row of resolved) {
  if (row.confidence !== 'high' && row.confidence !== 'medium') continue;
  byId[row.qloo_entity_id.toUpperCase()] = row.name;
  if (row.qloo_name && row.qloo_name !== row.name) {
    byQlooName[row.qloo_name] = row.name;
  }
}

for (const row of Object.values(expanded)) {
  byId[row.id.toUpperCase()] = row.name;
}

for (const [key, value] of Object.entries(aliases)) {
  if (key.includes('-') && key.length > 30) {
    byId[key.toUpperCase()] = value;
  } else {
    byQlooName[key] = value;
  }
}

const out = join(root, 'apps/worker/src/data/brand-display-map.ts');
writeFileSync(
  out,
  `/** Auto-generated */\nexport const BRAND_DISPLAY_BY_ID: Record<string, string> = ${JSON.stringify(byId, null, 2)};\nexport const BRAND_DISPLAY_BY_QLOO_NAME: Record<string, string> = ${JSON.stringify(byQlooName, null, 2)};\n`
);
console.log('Wrote', out);
