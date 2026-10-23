import type { EvalDensityStratum } from '../eval-density-stratum.js';

export type AdaptiveEvalAddressRow = {
  id?: string;
  label: string;
  address: string;
  stratum: EvalDensityStratum;
  adaptive_radius_km: number;
  n_brands: number;
  n_present: number;
  p10_raw: number;
  p10_chain: number;
  p10_blend: number;
  same_size_auc?: number;
  same_size_auc_ci?: [number, number];
  taste_percentile?: number;
};

export type ResultsAdaptiveAgg = {
  n_sites: number;
  p10_raw: number;
  p10_chain: number;
  p10_blend: number;
  p10_legacy_blend?: number;
  same_size_auc: number;
  same_size_auc_ci: [number, number];
  blend_lift_vs_chain_pp?: number;
  blend_lift_vs_chain_ci?: [number, number];
};

export type ResultsAdaptive = {
  per_address: AdaptiveEvalAddressRow[];
  agg: ResultsAdaptiveAgg;
  by_cat: Record<string, unknown>;
  by_stratum: Record<string, { radius_km: number }>;
};
