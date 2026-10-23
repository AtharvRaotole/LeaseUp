#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resolved = JSON.parse(
  readFileSync(join(root, 'data/brands/resolved_brand_ids.json'), 'utf8')
);
const ids = resolved
  .filter((row) => row.confidence === 'high' || row.confidence === 'medium')
  .map((row) => row.qloo_entity_id);
const out = join(root, 'apps/worker/src/data/tracked-brand-ids.ts');
writeFileSync(
  out,
  `/** Auto-generated from data/brands/resolved_brand_ids.json */\nexport const TRACKED_BRAND_IDS: string[] = ${JSON.stringify(ids, null, 2)};\nexport const TRACKED_BRAND_COUNT = ${ids.length};\n`
);
console.log(`Wrote ${ids.length} brand IDs to ${out}`);
