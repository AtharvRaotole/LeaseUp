#!/usr/bin/env node
/**
 * Build packages/fixtures/src/eval/results_adaptive.json + tables.md from data/qloo-eval-40/.
 */
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const DATA = join(ROOT, 'data/qloo-eval-40');
const OUT_JSON = join(ROOT, 'packages/fixtures/src/eval/results_adaptive.json');
const OUT_MD = join(ROOT, 'packages/fixtures/src/eval/tables.md');
const SRC_MD = join(DATA, 'tables.md');

const DEMO_EVAL_ID = {
  'chi_wicker': { fixtureKey: 'wicker-park' },
  'boulder_co': { fixtureKey: 'boulder' },
  'sevierville_tn': { fixtureKey: 'sevierville' },
};

function tastePercentileRank(stratAuc, allValues) {
  const sorted = [...allValues].sort((a, b) => a - b);
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sorted[mid] < stratAuc) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((100 * (lo + 0.5)) / sorted.length);
}

function streetAddressPlusCity(recordedAddress) {
  const trimmed = String(recordedAddress ?? '').trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  const street = parts[0];
  if (!street) return undefined;
  const city = parts.length >= 2 ? parts[1] : undefined;
  if (!city) return street;
  return `${street}, ${city}`;
}

function mapStratum(cat) {
  if (cat === 'dense_urban') return 'dense_urban';
  if (cat === 'college_town') return 'urban';
  if (cat === 'tourist') return 'tourist';
  if (cat === 'exurban') return 'exurban';
  if (cat === 'suburban') return 'suburban';
  return 'urban';
}

function aggPoint(agg, key) {
  const triple = agg[key];
  return triple ? triple[0] : undefined;
}

async function main() {
  const results = JSON.parse(await readFile(join(DATA, 'results_adaptive.json'), 'utf8'));
  const geo = JSON.parse(await readFile(join(DATA, 'geocoded.json'), 'utf8'));
  const geoById = Object.fromEntries(geo.map((g) => [g.id, g]));

  const stratAucValues = Object.values(results.per_address).map((row) => row.strat_auc_qloo);

  const per_address = [];
  for (const [id, row] of Object.entries(results.per_address)) {
    const g = geoById[id];
    const demo = DEMO_EVAL_ID[id];
    per_address.push({
      id: demo?.fixtureKey ?? id,
      eval_id: id,
      label: streetAddressPlusCity(g?.addr ?? '') ?? g?.display?.split(',')[0] ?? id,
      address: g?.addr ?? '',
      stratum: mapStratum(row.cat ?? g?.cat ?? 'urban'),
      adaptive_radius_km: row.r,
      n_brands: row.n,
      n_present: row.pos,
      p10_raw: row.qloo.p10,
      p10_chain: row.chain.p10,
      p10_blend: row.logit_blend.p10,
      same_size_auc: row.strat_auc_qloo,
      taste_percentile: tastePercentileRank(row.strat_auc_qloo, stratAucValues),
    });
  }

  per_address.sort((a, b) => a.eval_id.localeCompare(b.eval_id));

  const agg = results.agg;
  const bundle = {
    agg: {
      n_sites: results.n_addresses ?? per_address.length,
      p10_raw: aggPoint(agg, 'qloo.p10'),
      p10_chain: aggPoint(agg, 'chain.p10'),
      p10_blend: aggPoint(agg, 'logit_blend.p10'),
      p10_legacy_blend: aggPoint(agg, 'app_blend.p10'),
      same_size_auc: aggPoint(agg, 'strat_auc_qloo_mean'),
      same_size_auc_ci: [
        agg['strat_auc_qloo_mean']?.[1] ?? 0.646,
        agg['strat_auc_qloo_mean']?.[2] ?? 0.689,
      ],
      blend_lift_vs_chain_pp: (aggPoint(agg, 'diff_logit_blend_minus_chain.p10') ?? 0.065) * 100,
      blend_lift_vs_chain_ci: [
        (agg['diff_logit_blend_minus_chain.p10']?.[1] ?? 0.032) * 100,
        (agg['diff_logit_blend_minus_chain.p10']?.[2] ?? 0.095) * 100,
      ],
    },
    by_stratum: results.by_stratum ?? {},
    by_cat: results.by_cat ?? {},
    per_address,
  };

  await writeFile(OUT_JSON, JSON.stringify(bundle, null, 2) + '\n');
  await copyFile(SRC_MD, OUT_MD);
  console.log(`Wrote ${OUT_JSON} (${per_address.length} sites) and ${OUT_MD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
