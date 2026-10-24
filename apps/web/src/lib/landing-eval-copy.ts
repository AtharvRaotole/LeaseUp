import { formatP10PercentRounded, loadLiveQlooLiftAggregates } from '@leaseup/fixtures';

/** Plain-language proof lines from the committed 40-neighborhood eval file. */
export function landingEvalProofParagraphs(): string[] {
  const agg = loadLiveQlooLiftAggregates();

  return [
    `We tested ${agg.siteCount} US neighborhoods where we knew which chain stores were already open nearby (full steps on the methodology page).`,
    `Top-10 hit rate is the share of each ranking's top 10 picks that already had a store nearby in the trade area. Ranking by local shopper preferences alone reached ${formatP10PercentRounded(agg.rawQlooPrecisionAt10)}. Ranking by national chain size alone reached ${formatP10PercentRounded(agg.chainSizePrecisionAt10)}.`,
    `The production blend LeaseUp ships today reached ${formatP10PercentRounded(agg.logisticBlendPrecisionAt10)}, about ${agg.logisticBlendLiftVsChainPp.toFixed(1)} percentage points higher than chain size alone on this cohort.`,
  ];
}

/** One-line bridge above the methodology per-site metric table. */
export function methodologySiteTableBridgeLine(): string {
  const agg = loadLiveQlooLiftAggregates();
  return (
    `Rows in this table are per-demo-chip sanity checks. The headline proof is the recorded ${agg.siteCount}-site cohort: taste-only top-10 hit rate ${formatP10PercentRounded(agg.rawQlooPrecisionAt10)}, chain-size only ${formatP10PercentRounded(agg.chainSizePrecisionAt10)}, production blend ${formatP10PercentRounded(agg.logisticBlendPrecisionAt10)} (same numbers as the landing proof section).`
  );
}
