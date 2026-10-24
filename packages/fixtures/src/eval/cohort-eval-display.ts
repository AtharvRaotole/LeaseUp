import { DEMO_ADAPTIVE_PROOF_AGG } from '../demo-adaptive-proof.js';

/** Headline 40-site adaptive eval aggregates (OSM/ATP ground truth). */
export const COHORT_EVAL_AGG = DEMO_ADAPTIVE_PROOF_AGG;

/** Mid-size chain tier P@5 from preregistered tables (Qloo order vs chain size). */
export const COHORT_MID_TIER_P5 = {
  qloo: 0.53,
  chain: 0.23,
} as const;

/** Mean P@10 as a percent string with one decimal when needed (e.g. 82.5%, 76%). */
export function formatP10PercentExact(rate: number): string {
  const pct = rate * 100;
  const oneDecimal = Math.round(pct * 10) / 10;
  if (Math.abs(oneDecimal - Math.round(oneDecimal)) < 1e-9) {
    return `${Math.round(oneDecimal)}%`;
  }
  return `${oneDecimal.toFixed(1)}%`;
}

/** Whole-percent P@10 for short marketing lines (e.g. 83%, 54%). */
export function formatP10PercentRounded(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function cohortSiteCount(): number {
  return COHORT_EVAL_AGG.n_sites;
}

export function cohortRawVsChainRounded(): string {
  return `${formatP10PercentRounded(COHORT_EVAL_AGG.p10_raw)} vs ${formatP10PercentRounded(COHORT_EVAL_AGG.p10_chain)}`;
}

export function cohortBlendVsChainRounded(): string {
  return `${formatP10PercentRounded(COHORT_EVAL_AGG.p10_blend)} vs ${formatP10PercentRounded(COHORT_EVAL_AGG.p10_chain)}`;
}

export function cohortBlendLiftPpLabel(): string {
  return `+${COHORT_EVAL_AGG.blend_lift_vs_chain_pp} pp`;
}

export function cohortBlendVsChainExactWithLift(): string {
  return `${formatP10PercentExact(COHORT_EVAL_AGG.p10_blend)} vs ${formatP10PercentExact(COHORT_EVAL_AGG.p10_chain)} (${cohortBlendLiftPpLabel()})`;
}

export function cohortMidTierP5Rounded(): string {
  return `${formatP10PercentRounded(COHORT_MID_TIER_P5.qloo)} vs ${formatP10PercentRounded(COHORT_MID_TIER_P5.chain)}`;
}

/** Lead sentence for methodology adaptive-radius section. */
export function methodologyAdaptiveEvalLead(): string {
  const { p10_blend, p10_chain, p10_raw, same_size_auc, same_size_auc_ci, blend_lift_vs_chain_pp } =
    COHORT_EVAL_AGG;
  return (
    `On average, mean top-10 presence was ${formatP10PercentExact(p10_blend)} with our taste blend vs ` +
    `${formatP10PercentExact(p10_chain)} when sorted by chain size alone (+${blend_lift_vs_chain_pp} pp), and ` +
    `${formatP10PercentExact(p10_raw)} with taste order only. Rank match among similar-sized chains was ` +
    `${(same_size_auc * 100).toFixed(1)}% (likely range ${(same_size_auc_ci[0] * 100).toFixed(0)}% to ` +
    `${(same_size_auc_ci[1] * 100).toFixed(0)}%). Taste scores can still reflect brands that already operate nearby.`
  );
}

export function cohortExplainerHowRankedBody(): string {
  return (
    `Raw Qloo scores alone repeat similar lifestyle brands in every city and do not beat sorting by chain size on mean P@10 ` +
    `(${cohortRawVsChainRounded()} on ${cohortSiteCount()} US addresses). LeaseUp ships a fitted taste blend ` +
    `(${cohortBlendVsChainRounded()}, ${cohortBlendLiftPpLabel()}) and highlights lift when you order within a chain-size tier ` +
    `(for example mid-size P@5 ${cohortMidTierP5Rounded()}).`
  );
}

export function cohortExplainerLimitsBody(): string {
  return (
    `Raw Qloo order alone is weaker than sorting by national chain size on our ${cohortSiteCount()}-address backtest ` +
    `(about ${cohortRawVsChainRounded()} top-10 presence per ATP/OSM). The product leans on the taste blend ` +
    `(about ${cohortBlendVsChainRounded()}, ${cohortBlendLiftPpLabel()}) and on ranking within similar chain sizes. ` +
    `Map checks are helpful but not perfect: we corrected four mistaken absence labels found across 13 audited sites, yet a store can still be missing if it is not in All The Places or our OpenStreetMap snapshot (OSM covers 25 of 227 chains on demo chips).`
  );
}

export function cohortCohortLineMarketing(): string {
  return (
    `Across ${cohortSiteCount()} US neighborhoods, adding Qloo taste beat store count alone, ` +
    `${cohortBlendVsChainRounded()} mean top-10 presence (${cohortBlendLiftPpLabel()}).`
  );
}
