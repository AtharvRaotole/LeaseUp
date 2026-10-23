/**
 * Demo fixtures from REAL Qloo validation data
 * Source: round2/neigh_test_10km.json (actual API responses from Oct 2026)
 * Store locations: All The Places (CC0 license, Oct 2026 snapshot)
 *
 * To regenerate: node scripts/build-fixtures.mjs
 */

export type {
  EvalMetrosResults,
  EvalMetroRow,
  EvalSiteDensity,
  EvalRunBundle,
  EvalRunRow,
} from './eval/types.js';
export type { EvalMetricPanel, EvalManifest } from './eval/present-metrics.js';
export {
  getEvalManifest,
  buildEvalMetricPanels,
  buildEvalNotes,
  formatMetricValue,
  catalogForPanel,
} from './eval/present-metrics.js';
export { EVAL_METRIC_CATALOG, evalMetricDefinition, compareEvalMetric } from './eval/metrics-catalog.js';
export { buildEvalSiteSnapshot, type EvalSiteSnapshot } from './eval/build-snapshot.js';
export { loadEvalRunBundle, getEvalManifestRef } from './eval/load-bundle.js';
export {
  loadResultsAdaptive,
  findAdaptiveEvalRowByAddress,
  findAdaptiveEvalRowForDemo,
  adaptiveEvalRowCount,
  p10ToCountOf10,
  formatAdaptiveP10Count,
} from './eval/load-results-adaptive.js';
export type { ResultsAdaptive, AdaptiveEvalAddressRow } from './eval/results-adaptive-types.js';

export { wickerparkFixture } from './wicker-park.js';
export { boulderFixture } from './boulder.js';
export { seviervilleFixture } from './sevierville.js';

import { storeLocationsEmbedded } from './store-locations-data.js';

export const storeLocations = storeLocationsEmbedded;
export {
  haversineDistance,
  findStoresNearby,
  getNationalStoreCount,
  getStoreBrandIds,
  getStoreBrandIdSet,
  nearestStoreDistanceKm,
  mapStoresForTopBrands,
} from './store-geo.js';
export {
  computeBacktest,
  calculateAUC,
  filterInsightsToStoreBrands,
  type ComputedBacktest,
  type BacktestExample,
} from './backtest.js';
export {
  blendWithNationalPrior,
  orderInsightsByNationalStoreCount,
  CHAIN_PRIOR_BLEND_WEIGHT,
  type RankedInsight,
} from './ranking.js';
export {
  orderInsightsByLogisticBlend,
  getLogisticBlendCoefficients,
  DEMO_LOGISTIC_SITE_CONTEXT,
  defaultLogisticSiteContext,
  type LogisticBlendCoefficients,
  type LogisticBlendSiteContext,
} from './logistic-blend.js';
export {
  chainSizeTierFromStoreCount,
  isProspectChainTier,
  chainSizeTierLabel,
  type ChainSizeTier,
} from './chain-size-tier.js';
export {
  buildTierFitByEntityId,
  tasteFitPercentileWithinTier,
  type TierFitContext,
} from './taste-fit-beyond-chain.js';
export { loadLiveQlooLiftAggregates, type LiveQlooLiftAggregates } from './eval/live-qloo-lift/load-aggregates.js';
export {
  DEMO_CHIP_ADDRESSES,
  matchDemoFixtureId,
  normalizeAddress,
  type DemoFixtureId,
} from './demo-addresses.js';
export {
  DEMO_CHIP_DISPLAYS,
  matchDemoChipWithinMeters,
  type DemoChipDisplay,
} from './demo-chip-proximity.js';
export {
  demoChipPresentInTop10,
  demoChipHitRateLabel,
} from './demo-chip-hit-rates.js';
export {
  demoChipQlooProof,
  demoChipTopRankMovers,
  demoChipIdsByQlooLift,
  demoChipProofHitRateLabel,
  type DemoChipQlooProof,
  type DemoChipRankMover,
} from './demo-chip-qloo-proof.js';
export {
  parseQlooExplainabilityRows,
  topOverIndexRows,
  type TradeAreaTasteRow,
  type BrandExplainabilityRecording,
} from './qloo-explainability.js';
export {
  brandExplainabilityForDemo,
  listDemoExplainabilityRecordings,
} from './brand-explainability-loader.js';
export {
  wickerLandingTasteSnippet,
  type LandingTasteRow,
} from './landing-taste-snippet.js';
export {
  neighborhoodRankContrast,
  wickerSeviervilleRankContrast,
  type LandingRankContrastRow,
  type NeighborhoodRankLabel,
} from './landing-rank-contrast.js';
export {
  expectedRandomPresentInTop10,
  demoChipsRandomBaselineSummary,
  type DemoRandomBaselineSummary,
} from './landing-random-baseline.js';
export {
  adaptiveRadiusKmForStratum,
  densityToDefaultStratum,
  demoFixtureStratum,
  type EvalDensityStratum,
} from './eval-density-stratum.js';
export {
  METRIC_ID_SPEARMAN_PRESENCE,
  adaptiveEvalRadiusKm,
  spearmanRankCorrelation,
  monteCarloRandomPresentAt10,
  computeStrictEval,
  demoFixtureDensity,
  type StrictEvalSiteMetrics,
  type StrictEvalMetrics,
} from './strict-eval.js';
export {
  overpassDemoByFixture,
  DEMO_OSM_UNRECORDED_NOTE,
  type OverpassDemoRecording,
} from './overpass-demo.js';
export type { OverpassBrand } from './overpass-types.js';
export {
  brandReverseChicagoDemo,
  brandReverseFixtures,
  type BrandReverseDemoFixture,
} from './brand-reverse-chicago.js';
