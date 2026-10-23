/** Cohort headline metrics from the live Qloo lift study (see QLOO_LIFT_EVAL.md). */
export const liveQlooLiftAggregates = {
  recordedAt: '2026-10-23T00:00:00.000Z',
  siteCount: 40,
  siteCountTarget: 40,
  rawQlooPrecisionAt10: 0.54,
  chainSizePrecisionAt10: 0.76,
  legacyBlendPrecisionAt10: 0.59,
  sameSizeAuc: {
    value: 0.672,
    ciLow: 0.65,
    ciHigh: 0.693,
  },
  logisticBlendPrecisionAt10: 0.82,
  logisticBlendLiftVsChainPp: 6.5,
  logisticBlendLiftCiLowPp: 3.2,
  logisticBlendLiftCiHighPp: 9.5,
  heatmapAddsLift: false,
  fixed10kmSaturates: true,
  notes: [
    'Raw Qloo P@10 underperforms national chain size alone on the recorded cohort.',
    'Legacy 0.75/0.25 Qloo and chain blend lands between the two baselines.',
    'Same-size tier AUC isolates taste signal within matched chain footprints.',
    'Logistic companion blend (chain size, density, Qloo) is the production ranking prior.',
    'Qloo scores partly reflect brands that already operate nearby; read lift with that caveat.',
  ],
} as const;
