#!/usr/bin/env node
/** Regenerate tables.md from committed results_adaptive.json (for review in git). */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const JSON_PATH = join(ROOT, 'packages/fixtures/src/eval/results_adaptive.json');
const MD_PATH = join(ROOT, 'packages/fixtures/src/eval/tables.md');

const data = JSON.parse(await readFile(JSON_PATH, 'utf8'));
const lines = [
  '# Adaptive-radius eval (per site)',
  '',
  `Cohort: ${data.agg.n_sites} US addresses. Mean top-10 presence: taste-aware blend ${(data.agg.p10_blend * 100).toFixed(0)}%, chain size ${(data.agg.p10_chain * 100).toFixed(0)}%, raw Qloo ${(data.agg.p10_raw * 100).toFixed(0)}%.`,
  '',
  '| Site | Stratum | Radius (km) | Brands | Present | P@10 raw | P@10 chain | P@10 blend | Same-size AUC | Taste pct |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |',
];

for (const row of data.per_address) {
  const auc =
    row.same_size_auc !== undefined && row.same_size_auc_ci
      ? `${row.same_size_auc.toFixed(3)} [${row.same_size_auc_ci[0].toFixed(2)}, ${row.same_size_auc_ci[1].toFixed(2)}]`
      : 'n/a';
  const pct = row.taste_percentile !== undefined ? `${row.taste_percentile}` : 'n/a';
  lines.push(
    `| ${row.label} | ${row.stratum} | ${row.adaptive_radius_km} | ${row.n_brands} | ${row.n_present} | ${row.p10_raw} | ${row.p10_chain} | ${row.p10_blend} | ${auc} | ${pct} |`
  );
}

lines.push('');
await writeFile(MD_PATH, lines.join('\n'));
console.log(`Wrote ${MD_PATH} (${data.per_address.length} rows)`);
