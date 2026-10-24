/**
 * Worker-safe exports: no large eval result JSON bundles.
 */
export type { EvalSiteDensity } from './eval/types.js';
export type { EvalDensityStratum } from './eval-density-stratum.js';
export {
  adaptiveRadiusKmForStratum,
  densityToDefaultStratum,
  demoFixtureStratum,
  prospectAbsenceRadiusKm,
  PROSPECT_TRADE_AREA_FLOOR_KM,
} from './eval-density-stratum.js';
export {
  DEMO_CHIP_ADDRESSES,
  matchDemoFixtureId,
  normalizeAddress,
  type DemoFixtureId,
} from './demo-addresses.js';
export {
  demoAdaptiveProofRow,
  DEMO_ADAPTIVE_PROOF_AGG,
  DEMO_ADAPTIVE_PROOF_ROWS,
} from './demo-adaptive-proof.js';
export {
  demoAnalyzeStrictEval,
  demoAnalyzeBacktests,
} from './demo-analyze-precomputed.js';
export { expectedRandomPresentInTop10 } from './landing-random-baseline.js';
export { rankTopPercentFromOrder } from './rank-top-percent.js';
export {
  whyBrandRankSummaryLine,
  tasteMatchHerePhrase,
  fitPercentileShortLabel,
  leaseUpRankReasonHead,
  brandRankSurfaceStrings,
  assertTopPercentCopyMatchesRank,
} from './rank-broker-lines.js';
export {
  computeBacktest,
  calculateAUC,
  filterInsightsToStoreBrands,
  type ComputedBacktest,
} from './backtest.js';
export {
  orderInsightsByNationalStoreCount,
  type RankedInsight,
} from './ranking.js';
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
  orderInsightsByLogisticBlend,
  DEMO_LOGISTIC_SITE_CONTEXT,
  defaultLogisticSiteContext,
  getLogisticBlendCoefficients,
  type LogisticBlendSiteContext,
} from './logistic-blend.js';
export {
  chainSizeTierFromStoreCount,
  isProspectChainTier,
  chainSizeTierLabel,
  type ChainSizeTier,
} from './chain-size-tier.js';
export { buildTierFitByEntityId, type TierFitContext } from './taste-fit-beyond-chain.js';
export {
  METRIC_ID_SPEARMAN_PRESENCE,
  adaptiveEvalRadiusKm,
  computeStrictEval,
  demoFixtureDensity,
  type StrictEvalSiteMetrics,
} from './strict-eval.js';
export { buildEvalSiteSnapshot } from './eval/build-snapshot.js';
export { wickerparkFixture } from './wicker-park.js';
export { boulderFixture } from './boulder.js';
export { seviervilleFixture } from './sevierville.js';
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
} from './demo-chip-qloo-proof.js';
export {
  parseQlooExplainabilityRows,
  parseQlooAudienceRows,
  topOverIndexRows,
  type TradeAreaTasteRow,
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
  distinctPitchAudienceLists,
  PITCH_AUDIENCE_CANDIDATE_MAX,
} from './distinct-pitch-audiences.js';
// Live audience recordings are not bundled into the worker: it fetches
// live-audiences.compact.json from ASSETS and binds it with this factory.
export {
  createBrandExplainabilityStore,
  type BrandExplainabilityStore,
  type LiveAudiencesCompact,
} from './brand-explainability-store.js';
export { overpassDemoByFixture, DEMO_OSM_UNRECORDED_NOTE } from './overpass-demo.js';
export {
  BLEECKER_NYC,
  REI_ENTITY_ID,
  REI_QID,
  REI_SOHO_OSM_NODE,
  REI_NAME_ONLY_TAGS,
  UNRELATED_REI_NAME_TAGS,
} from './osm-brand-match-samples.js';
export { brandReverseFixtures, type BrandReverseDemoFixture } from './brand-reverse-chicago.js';
export { storeLocationsEmbedded as storeLocations } from './store-locations-data.js';
export {
  brandRealEstateForEntity,
  brandRealEstateDataset,
  brandRealEstateContactLine,
  type BrandRealEstateEntry,
} from './brand-real-estate.js';
export {
  tradeAreaShopperFixtureForDemo,
  type TradeAreaShopperFixture,
} from './trade-area-shoppers-loader.js';
export {
  parseQlooTradeAreaTagInsights,
  TRADE_AREA_SHOPPER_TAG_SUBTYPES,
  WICKER_TRADE_AREA_TAG_INSIGHTS_SAMPLE,
  type ParsedTradeAreaShoppersSnapshot,
} from './qloo-trade-area-tag-insights.js';
export {
  DEMO_PITCH_BOULDER_ULTA,
  DEMO_PITCH_BOULDER_ULTA_ID,
} from './demo-pitch-boulder-ulta.js';
