#!/usr/bin/env node
/**
 * Copy preregistered study outputs into packages/fixtures/src/eval/.
 *
 * Usage:
 *   node scripts/eval/sync-results-adaptive.mjs /path/to/results_adaptive.json /path/to/tables.md
 */
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const EVAL_DIR = join(ROOT, 'packages/fixtures/src/eval');
const JSON_OUT = join(EVAL_DIR, 'results_adaptive.json');
const MD_OUT = join(EVAL_DIR, 'tables.md');

const [jsonSrc, mdSrc] = process.argv.slice(2);
if (!jsonSrc || !mdSrc) {
  console.error('Usage: node scripts/eval/sync-results-adaptive.mjs <results_adaptive.json> <tables.md>');
  process.exit(1);
}

const parsed = JSON.parse(await readFile(jsonSrc, 'utf8'));
if (!parsed.agg || !Array.isArray(parsed.per_address)) {
  throw new Error('results_adaptive.json must include agg and per_address[]');
}
if (parsed.per_address.length !== parsed.agg.n_sites) {
  throw new Error(
    `per_address length ${parsed.per_address.length} does not match agg.n_sites ${parsed.agg.n_sites}`
  );
}

await copyFile(jsonSrc, JSON_OUT);
await copyFile(mdSrc, MD_OUT);

console.log(`Synced ${parsed.per_address.length} sites to ${JSON_OUT} and ${MD_OUT}`);
