/**
 * Demo fixtures from REAL Qloo validation data
 * Source: round2/neigh_test_10km.json (actual API responses from Oct 2026)
 * Store locations: All The Places (CC0 license, Oct 2026 snapshot)
 *
 * To regenerate: node scripts/build-fixtures.mjs
 */

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
export { blendWithNationalPrior, CHAIN_PRIOR_BLEND_WEIGHT, type RankedInsight } from './ranking.js';
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
  overpassDemoByFixture,
  DEMO_OSM_UNRECORDED_NOTE,
  type OverpassDemoRecording,
} from './overpass-demo.js';
export type { OverpassBrand } from './overpass-types.js';
