import { matchDemoFixtureId, type DemoFixtureId } from './demo-addresses.js';
import type { AdaptiveEvalAddressRow, ResultsAdaptiveAgg } from './eval/results-adaptive-types.js';

/** Precomputed adaptive-eval proof rows for demo chips only (no 40-row JSON in worker). */
export const DEMO_ADAPTIVE_PROOF_ROWS: Record<DemoFixtureId, AdaptiveEvalAddressRow> = {
  wicker: {
    eval_id: 'chi_wicker',
    id: 'wicker-park',
    label: '1560 N Milwaukee Ave',
    address: '1560 N Milwaukee Ave, Chicago, IL 60622',
    stratum: 'dense_urban',
    adaptive_radius_km: 1.5,
    n_brands: 224,
    n_present: 43,
    p10_raw: 0.3,
    p10_chain: 0.7,
    p10_blend: 0.9,
    same_size_auc: 0.6884709730171709,
    taste_percentile: 54,
  },
  boulder: {
    eval_id: 'boulder_co',
    id: 'boulder',
    label: '1300 Pearl St',
    address: '1300 Pearl St, Boulder, CO 80302',
    stratum: 'urban',
    adaptive_radius_km: 5,
    n_brands: 224,
    n_present: 72,
    p10_raw: 0.8,
    p10_chain: 0.8,
    p10_blend: 0.9,
    same_size_auc: 0.6839938239835306,
    taste_percentile: 59,
  },
  sevierville: {
    eval_id: 'sevierville_tn',
    id: 'sevierville',
    label: '125 Collier Dr',
    address: '125 Collier Dr, Sevierville, TN 37862',
    stratum: 'tourist',
    adaptive_radius_km: 5,
    n_brands: 219,
    n_present: 74,
    p10_raw: 0.7,
    p10_chain: 0.9,
    p10_blend: 0.9,
    same_size_auc: 0.721,
    taste_percentile: 87,
  },
};

export const DEMO_ADAPTIVE_PROOF_AGG: ResultsAdaptiveAgg = {
  n_sites: 40,
  p10_raw: 0.5375,
  p10_chain: 0.755,
  p10_blend: 0.8175,
  p10_legacy_blend: 0.59,
  same_size_auc: 0.6670294642091228,
  same_size_auc_ci: [0.6461676947462455, 0.6885277968924622],
  blend_lift_vs_chain_pp: 6.25,
  blend_lift_vs_chain_ci: [2.75, 9.25],
};

export function demoAdaptiveProofRow(fixtureId: DemoFixtureId): AdaptiveEvalAddressRow {
  return DEMO_ADAPTIVE_PROOF_ROWS[fixtureId];
}

/** Demo-chip proof rows only (worker-safe; no 40-site JSON). */
export function findDemoAdaptiveProofByAddress(address: string): AdaptiveEvalAddressRow | undefined {
  const fixtureId = matchDemoFixtureId(address);
  if (fixtureId) return demoAdaptiveProofRow(fixtureId);
  return undefined;
}
