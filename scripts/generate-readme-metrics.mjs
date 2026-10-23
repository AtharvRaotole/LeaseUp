#!/usr/bin/env node
/**
 * Emit README-ready metrics from recorded fixtures (no invented numbers).
 * Usage: node scripts/generate-readme-metrics.mjs
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

execSync('pnpm --filter @leaseup/fixtures build', { stdio: 'inherit', cwd: process.cwd() });

const { wickerparkFixture } = await import('../packages/fixtures/dist/wicker-park.js');
const { boulderFixture } = await import('../packages/fixtures/dist/boulder.js');
const { seviervilleFixture } = await import('../packages/fixtures/dist/sevierville.js');
const { computeBacktest } = await import('../packages/fixtures/dist/backtest.js');
const storeMeta = JSON.parse(readFileSync(join(process.cwd(), 'packages/fixtures/src/store-locations.json'), 'utf8'));

const fixtures = [
  { label: 'Wicker Park, Chicago', fixture: wickerparkFixture },
  { label: 'Boulder, Colorado', fixture: boulderFixture },
  { label: 'Sevierville, Tennessee', fixture: seviervilleFixture },
];

const radius = 10;

console.log('## Demo chip metrics (from fixtures)\n');
console.log('| Location | Brands in Qloo fixture | P@10 (10km) | AUC |');
console.log('| --- | ---: | ---: | ---: |');

for (const { label, fixture } of fixtures) {
  const bt = computeBacktest(fixture.insights, fixture.location.latitude, fixture.location.longitude, radius);
  console.log(
    `| ${label} | ${fixture.insights.length} | ${bt.precisionAt10.toFixed(2)} | ${bt.auc.toFixed(3)} |`
  );
}

console.log(`\nATP snapshot brands tracked: ${getStoreBrandIds().length}`);

const neighPath = join(process.cwd(), 'data/research/round2/neigh_test_10km.json');
try {
  const neigh = JSON.parse(readFileSync(neighPath, 'utf8'));
  const rows = neigh.rows || [];
  const meanAuc =
    rows.reduce((sum, r) => sum + (r.auc_qloo || 0), 0) / Math.max(rows.length, 1);
  const wins = rows.filter((r) => (r.auc_qloo || 0) > (r.auc_fp || 0)).length;
  console.log(`\nValidation file neighborhoods: ${rows.length}`);
  console.log(`Mean Qloo AUC (recorded validation): ${meanAuc.toFixed(3)}`);
  console.log(`Qloo AUC beats footprint baseline in ${wins}/${rows.length} neighborhoods`);
} catch {
  console.log('\n(Skip validation aggregate — data/research/round2/neigh_test_10km.json not found)');
}
