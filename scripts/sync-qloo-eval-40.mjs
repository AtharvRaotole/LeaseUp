#!/usr/bin/env node
/**
 * Regenerate ground truth + adaptive metrics from fixed tiles, sync headline numbers to fixtures.
 * Requires: python3 with numpy, scipy, sklearn. Qloo insights cached in data/qloo-eval-40.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const evalDir = join(root, 'data/qloo-eval-40');

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: root, env: { ...process.env, LEASEUP_ROOT: root } });
}

if (!existsSync(join(root, 'apps/worker/public/tiles/brands.json'))) {
  console.log('Building ATP geotiles for eval ground truth...');
  run('node scripts/build-geotiles.mjs');
}

run(`python3 ${join(evalDir, 'ground_truth.py')}`);
for (const mode of ['adaptive', 'fixed10', 'fixed5']) {
  run(`python3 ${join(evalDir, 'analyze.py')} ${mode}`);
}

const adaptive = JSON.parse(readFileSync(join(evalDir, 'results_adaptive.json'), 'utf8'));
const agg = adaptive.agg;

function mean(key) {
  const v = agg[key];
  return Array.isArray(v) ? v[0] : v;
}

const strat = agg['strat_auc_qloo_mean'];
const diffP10 = agg['diff_logit_blend_minus_chain.p10'];
const headline = {
  recordedAt: new Date().toISOString(),
  siteCount: adaptive.n_addresses,
  siteCountTarget: 40,
  rawQlooPrecisionAt10: mean('qloo.p10'),
  chainSizePrecisionAt10: mean('chain.p10'),
  legacyBlendPrecisionAt10: mean('app_blend.p10'),
  sameSizeAuc: {
    value: Array.isArray(strat) ? strat[0] : strat,
    ciLow: Array.isArray(strat) ? strat[1] : strat,
    ciHigh: Array.isArray(strat) ? strat[2] : strat,
  },
  logisticBlendPrecisionAt10: mean('logit_blend.p10'),
  logisticBlendLiftVsChainPp: (Array.isArray(diffP10) ? diffP10[0] : diffP10) * 100,
  logisticBlendLiftCiLowPp: (Array.isArray(diffP10) ? diffP10[1] : 0) * 100,
  logisticBlendLiftCiHighPp: (Array.isArray(diffP10) ? diffP10[2] : 0) * 100,
  heatmapAddsLift: false,
  fixed10kmSaturates: true,
  notes: [
    'Regenerated from data/qloo-eval-40 with fixed OSM snapshot tile coordinates.',
    'Raw Qloo P@10 vs chain size on adaptive-radius ground truth.',
  ],
};

execSync('node scripts/eval/build-adaptive-fixture.mjs', { stdio: 'inherit', cwd: root });
writeFileSync(
  join(root, 'packages/fixtures/src/eval/live-qloo-lift/aggregates.json'),
  JSON.stringify(headline, null, 2)
);

const aggregatesTs = `/** Cohort headline metrics from the live Qloo lift study (see QLOO_LIFT_EVAL.md). */
export const liveQlooLiftAggregates = ${JSON.stringify(headline, null, 2)} as const;
`;
writeFileSync(join(root, 'packages/fixtures/src/eval/live-qloo-lift/aggregates-data.ts'), aggregatesTs);

console.log(JSON.stringify({ event: 'sync_qloo_eval_done', headline }, null, 2));
