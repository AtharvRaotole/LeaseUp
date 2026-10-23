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

import storeLocations from './store-locations.json';

export { storeLocations };
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
