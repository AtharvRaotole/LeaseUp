import { loadLiveQlooLiftAggregates } from '@leaseup/fixtures';

/** Plain-language proof lines from the committed 40-neighborhood eval file. */
export function landingEvalProofParagraphs(): string[] {
  const agg = loadLiveQlooLiftAggregates();
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return [
    `We tested ${agg.siteCount} US neighborhoods where we knew which chain stores were already open nearby (full steps on the methodology page).`,
    `Using local shopper preferences alone, ${pct(agg.rawQlooPrecisionAt10)} of our top 10 suggestions already had a store nearby. Sorting by how big the chain is nationally did better, at ${pct(agg.chainSizePrecisionAt10)}, but still missed many openings.`,
    `The ranking LeaseUp ships today spots brands that are not nearby ${pct(agg.logisticBlendPrecisionAt10)} of the time in the top 10, about ${agg.logisticBlendLiftVsChainPp.toFixed(1)} percentage points better than size alone on this set.`,
  ];
}
