#!/usr/bin/env node
/**
 * Assert worker bundle stays lean (no qloo-eval-40 / full eval JSON).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'apps/worker/.bundle-check');
const INDEX = join(OUT, 'index.js');

const dry = spawnSync(
  'pnpm',
  ['--filter', '@leaseup/worker', 'exec', 'wrangler', 'deploy', '--dry-run', '--outdir', OUT],
  { cwd: ROOT, stdio: 'inherit' }
);
if (dry.status !== 0) process.exit(dry.status ?? 1);

const js = readFileSync(INDEX, 'utf8');
const forbidden = [
  'insights_affinity.json',
  'ground_truth.json',
  'results_adaptive.json',
  'qloo-eval-40/insights',
];
for (const needle of forbidden) {
  if (js.includes(needle)) {
    console.error(`Worker bundle must not contain "${needle}"`);
    process.exit(1);
  }
}

const bytes = statSync(INDEX).size;
const maxBytes = 2_400_000;
if (bytes > maxBytes) {
  console.error(`Worker index.js too large: ${bytes} bytes (max ${maxBytes})`);
  process.exit(1);
}

console.log(`Worker bundle OK: index.js ${(bytes / 1024).toFixed(1)} KiB (max ${(maxBytes / 1024).toFixed(0)} KiB)`);
