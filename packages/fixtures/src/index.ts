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
  demoAdaptiveProofRow,
  findDemoAdaptiveProofByAddress,
  DEMO_ADAPTIVE_PROOF_AGG,
  DEMO_ADAPTIVE_PROOF_ROWS,
} from './demo-adaptive-proof.js';
export {
  loadResultsAdaptive,
  findAdaptiveEvalRowByAddress,
  findAdaptiveEvalRowForDemo,
  adaptiveEvalRowCount,
  p10ToCountOf10,
  formatAdaptiveP10Count,
} from './eval/load-results-adaptive.js';
export {
  adaptiveEvalSiteDisplayLabel,
  streetAddressPlusCity,
  isPurelyNumericSiteLabel,
  placeFromEvalId,
} from './eval/adaptive-eval-site-label.js';
export {
  WICKER_LANDING_PITCH_TOP,
  wickerLandingPitchTopNames,
  wickerLandingPitchTopEntityIds,
} from './wicker-landing-pitch-order.js';
export {
  COHORT_EVAL_AGG,
  COHORT_MID_TIER_P5,
  formatP10PercentExact,
  formatP10PercentRounded,
  cohortSiteCount,
  cohortRawVsChainRounded,
  cohortBlendVsChainRounded,
  cohortBlendLiftPpLabel,
  cohortBlendVsChainExactWithLift,
  cohortMidTierP5Rounded,
  methodologyAdaptiveEvalLead,
  cohortExplainerHowRankedBody,
  cohortExplainerLimitsBody,
  cohortCohortLineMarketing,
} from './eval/cohort-eval-display.js';
export type { ResultsAdaptive, AdaptiveEvalAddressRow } from './eval/results-adaptive-types.js';
export { rankTopPercentFromOrder } from './rank-top-percent.js';
export {
  whyBrandRankSummaryLine,
  tasteMatchHerePhrase,
  fitPercentileShortLabel,
  leaseUpRankReasonHead,
  brandRankSurfaceStrings,
  assertTopPercentCopyMatchesRank,
} from './rank-broker-lines.js';

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
  parseQlooAudienceRows,
  topOverIndexRows,
  type TradeAreaTasteRow,
  type BrandExplainabilityRecording,
} from './qloo-explainability.js';
export {
  topBrandTasteOverlapSignals,
  formatBrandTasteOverlapLine,
  deterministicWhyBrandTasteSummary,
  computeBrandLocalAudienceOverlap,
  BRAND_AUDIENCE_MIN_AFFINITY,
  BRAND_AUDIENCE_TOP_K,
  LOCAL_AUDIENCE_TOP_K,
  BRAND_AUDIENCE_MIN_PANEL_LIFT,
  BRAND_AUDIENCE_MAX_SHOWN,
  SENSITIVE_AUDIENCE_NAMES,
  isSensitiveAudience,
  QLOO_AUDIENCE_DISPLAY_NAMES,
  audienceDisplayName,
  type BrandTasteOverlapSignal,
  type QlooAudienceRow,
} from './qloo-brand-taste-overlap.js';
export {
  sanitizeWhyBrandTasteSummary,
  pitchBrandTasteFitSentence,
  WHY_BRAND_TASTE_BANNED_PHRASES,
} from './why-brand-taste-summary.js';
export {
  brandExplainabilityForDemo,
  listDemoExplainabilityRecordings,
  audiencePanelBaseline,
  audiencePanelSize,
} from './brand-explainability-loader.js';
export {
  distinctPitchAudienceLists,
  PITCH_AUDIENCE_CANDIDATE_MAX,
} from './distinct-pitch-audiences.js';
export {
  createBrandExplainabilityStore,
  type BrandExplainabilityStore,
  type LiveAudiencesCompact,
} from './brand-explainability-store.js';
export {
  isNonRetailTasteName,
  pickRetailShopperTasteLabel,
  retailShopperTasteLabel,
  BLEECKER_LIKE_NON_RETAIL_TASTE,
  type TasteRowInput,
} from './retail-taste-tag-filter.js';
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
  prospectAbsenceRadiusKm,
  PROSPECT_TRADE_AREA_FLOOR_KM,
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
export { buildWatchRunSnapshot, diffWatchSnapshots } from './watch-diff.js';
export {
  DEMO_PITCH_BOULDER_ULTA,
  DEMO_PITCH_BOULDER_ULTA_ID,
} from './demo-pitch-boulder-ulta.js';
export {
  brandRealEstateForEntity,
  brandRealEstateDataset,
  brandRealEstateContactLine,
  type BrandRealEstateEntry,
} from './brand-real-estate.js';
