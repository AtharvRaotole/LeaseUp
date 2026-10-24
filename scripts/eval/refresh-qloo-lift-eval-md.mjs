#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const tables = readFileSync(join(root, 'data/qloo-eval-40/tables.md'), 'utf8');

function gitHead() {
  try {
    return execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const metricsCommit = process.env.EVAL_METRICS_COMMIT?.trim() || gitHead();

const head = `# LeaseUp: does Qloo add signal beyond chain size?

Run on Oct 23, 2026 (ET). Original live Qloo API collection and preregistration are unchanged. **Metrics below were recomputed on Oct 24, 2026 (UTC)** on integration \`f94ee23\` after rebuilding OSM snapshot tiles from cached Overpass raw and regenerating ATP/OSM ground truth. Qloo \`insights_affinity.json\` is unchanged (no new API calls).

## Reproducibility (Oct 24, 2026 refresh)

Integration base: \`f94ee23\`. Metrics and tiles in this tree: git commit \`${metricsCommit}\`.

\`\`\`bash
node scripts/osm-snapshot-retile-report.mjs
node scripts/copy-osm-tiles.mjs
node scripts/apply-store-supplements.mjs
node scripts/sync-qloo-eval-40.mjs
node scripts/eval/fit-logistic-blend.mjs
\`\`\`

Uses cached \`data/qloo-eval-40/\` Qloo insights and \`data/osm-snapshot/raw/\` Overpass JSON only (no KV writes, no live Qloo or Overpass in the refresh step).

## Setup
- **Sample:** 40 US retail addresses, geocoded with Nominatim at 1 request/s. Six categories: dense urban (9), affluent suburban (6), college town (6), small town (6), tourist (6), Sunbelt growth (7).
- **Candidates:** 227 tracked brands scored by Qloo at each address (most sites 224 brands).
- **Ground truth:** present if a store appears in ATP geotiles or OSM snapshot within a density-adaptive radius (1.5 km, 5 km, or 15 km). Fixed 10 km and 5 km sensitivity runs are in \`results_fixed10.json\` and \`results_fixed5.json\`.
- **Confidence intervals:** 95% bootstrap over addresses (2000 resamples) unless noted.

## Headline metrics (adaptive radius, 40 addresses)

| Ranker | Mean P@10 | Notes |
|--------|-----------|-------|
| Raw Qloo | 0.54 [0.46, 0.61] | exact 0.538 |
| Chain size | 0.76 [0.71, 0.80] | exact 0.760 |
| Logistic blend | 0.82 [0.77, 0.86] | exact 0.825 (+6.5 pp vs chain [3.3, 9.3]) |
| Random | 0.29 [0.25, 0.33] | |

| Lift metric | Value |
|-------------|-------|
| Same-size tier AUC (mean per-address) | 0.664 [0.642, 0.687] |
| Partial Spearman Qloo ~ presence \\| log chain size | 0.24 [0.21, 0.28] |
| Mid-size tier P@5 (439 to 864 stores), Qloo vs chain | 0.53 vs 0.23 |

## Findings (summary)
1. Raw Qloo order still underperforms chain size on mean top-10 presence (0.54 vs 0.76).
2. Same-size tier AUC **0.664** and logistic blend **0.825 vs 0.760** chain P@10 show lift after controlling for footprint.
3. Mid-size chains: within-tier P@5 **0.53 vs 0.23** (Qloo vs chain order). Small tier (<177 stores): **0.31 vs 0.10**.
4. Heatmap features do not beat insights for ranking (see tables).

## Strongest honest claim for judges
> National chain size alone tells you who is probably already here. Qloo adds what chain size cannot. Among similar-size chains, Qloo's local taste score separates present vs absent about two-thirds of the time (AUC 0.66, 95% CI 0.64 to 0.69, 40 US addresses). The shipped logistic blend raises mean top-10 presence from 76% to 83%. For mid-size chains, Qloo-ordered shortlists beat size-ordered ones (53% vs 23% P@5).

Do **not** claim that raw Qloo affinity beats chain size.

## Demo addresses
Chicago Wicker Park (\`chi_wicker\`): adaptive 1.5 km, blend P@10 **0.9 vs 0.7** chain (see \`results_adaptive.json\`).

## Files (\`data/qloo-eval-40/\`)
\`analyze.py\`, \`ground_truth.py\`, \`insights_affinity.json\`, \`results_adaptive.json\`, \`tables.md\`, \`PREREGISTRATION.md\`

## Tables
`;

writeFileSync(join(root, 'data/qloo-eval-40/QLOO_LIFT_EVAL.md'), `${head}${tables}\n`);
console.log('Wrote data/qloo-eval-40/QLOO_LIFT_EVAL.md');
