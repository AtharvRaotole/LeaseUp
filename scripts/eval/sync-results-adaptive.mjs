#!/usr/bin/env node
/**
 * Refresh fixtures from data/qloo-eval-40/ (or copy external study files into that tree first).
 */
import { copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data/qloo-eval-40');

const [jsonSrc, mdSrc] = process.argv.slice(2);
if (jsonSrc && mdSrc) {
  await copyFile(jsonSrc, join(DATA_DIR, 'results_adaptive.json'));
  await copyFile(mdSrc, join(DATA_DIR, 'tables.md'));
}

const build = spawnSync('node', [join(ROOT, 'scripts/eval/build-adaptive-fixture.mjs')], {
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

const fit = spawnSync('python3', [join(ROOT, 'scripts/eval/fit-logistic-blend-qloo-eval.py')], {
  stdio: 'inherit',
});
process.exit(fit.status ?? 1);
