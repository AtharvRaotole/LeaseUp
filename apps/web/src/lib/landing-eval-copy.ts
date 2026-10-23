import { loadLiveQlooLiftAggregates } from '@leaseup/fixtures';

/** Plain-language proof lines from the committed 40-neighborhood eval file. */
export function landingEvalProofParagraphs(): string[] {
  const agg = loadLiveQlooLiftAggregates();
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return [
    `We tested ${agg.siteCount} US neighborhoods where we knew which chain stores were already open nearby (full steps on the methodology page).`,
    `Precision at 10 (P@10) is the share of each ranking's top 10 picks that already had a store in the trade area. Ranking by local shopper preferences alone reached P@10 ${pct(agg.rawQlooPrecisionAt10)}. Ranking by national chain size alone reached P@10 ${pct(agg.chainSizePrecisionAt10)}.`,
    `The production blend LeaseUp ships today reached P@10 ${pct(agg.logisticBlendPrecisionAt10)}, about ${agg.logisticBlendLiftVsChainPp.toFixed(1)} percentage points higher than chain size alone on this cohort.`,
  ];
}
