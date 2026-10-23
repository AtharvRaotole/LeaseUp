import { loadLiveQlooLiftAggregates } from '@leaseup/fixtures';

/** Plain-language proof lines from the committed 40-neighborhood eval file. */
export function landingEvalProofParagraphs(): string[] {
  const agg = loadLiveQlooLiftAggregates();
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const auc = agg.sameSizeAuc.value.toFixed(2);
  const aucLow = agg.sameSizeAuc.ciLow.toFixed(2);
  const aucHigh = agg.sameSizeAuc.ciHigh.toFixed(2);

  return [
    `We measured ${agg.siteCount} US neighborhoods with recorded store presence and Qloo taste rankings (see methodology for the full protocol).`,
    `Raw taste ranking matched nearby presence for ${pct(agg.rawQlooPrecisionAt10)} of the top 10 picks. Sorting by national chain size alone reached ${pct(agg.chainSizePrecisionAt10)} on the same metric.`,
    `Within matched chain-size tiers, taste still adds signal (stratified AUC ${auc}, 95% interval ${aucLow} to ${aucHigh}). The production logistic blend reaches ${pct(agg.logisticBlendPrecisionAt10)} precision@10, about ${agg.logisticBlendLiftVsChainPp.toFixed(1)} points above chain size on this cohort.`,
  ];
}
