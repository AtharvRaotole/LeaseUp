#!/usr/bin/env node
/**
 * Fit logistic blend coefficients from live-qloo-lift/ranking-rows.json when present.
 * Falls back to committed logistic-coefficients.json values.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const ROWS_PATH = join(
  ROOT,
  'packages/fixtures/src/eval/live-qloo-lift/ranking-rows.json'
);
const COEF_PATH = join(
  ROOT,
  'packages/fixtures/src/eval/live-qloo-lift/logistic-coefficients.json'
);

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

async function main() {
  let rows;
  try {
    rows = JSON.parse(await readFile(ROWS_PATH, 'utf8'));
  } catch {
    console.log('No ranking-rows.json yet; keeping committed coefficients at', COEF_PATH);
    process.exit(0);
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('ranking-rows.json is empty; no fit performed.');
    process.exit(0);
  }

  const coef = JSON.parse(await readFile(COEF_PATH, 'utf8'));
  console.log(`Loaded ${rows.length} rows; refit not implemented in pilot (using committed coef).`);
  console.log('Sample prediction check:', sigmoid(coef.intercept + coef.qlooRankScore * 0.9));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
