/**
 * Demo locations with validated backtest results
 */
export const DEMO_LOCATIONS = {
  wickerPark: {
    name: 'Wicker Park, Chicago',
    address: '1574 N Milwaukee Ave, Chicago, IL 60622',
    latitude: 41.9088,
    longitude: -87.6776,
    city: 'Chicago',
    neighborhood: 'Wicker Park',
    backtest: {
      auc: 0.797,
      precisionAt10: 1.0,
      totalStores: 36,
      predictedStores: 36,
    },
  },
  sevierville: {
    name: 'Sevierville, Tennessee',
    address: '125 Collier Dr, Sevierville, TN 37862',
    latitude: 35.8681,
    longitude: -83.5618,
    city: 'Sevierville',
    neighborhood: 'Sevierville',
    backtest: {
      auc: 0.742,
      precisionAt10: 0.8,
      totalStores: 29,
      predictedStores: 25,
    },
  },
  boulder: {
    name: 'Boulder, Colorado',
    address: '1125 Pearl St, Boulder, CO 80302',
    latitude: 40.0150,
    longitude: -105.2705,
    city: 'Boulder',
    neighborhood: 'Pearl Street',
    backtest: {
      auc: 0.87,
      precisionAt10: 1.0,
      totalStores: 28,
      predictedStores: 28,
    },
  },
} as const;

/**
 * Brand entities used in fixtures (from research data)
 */
export const DEMO_BRANDS = {
  'Trader Joe\'s': { entityId: 'urn:qloo:entity:brand:trader_joes', popularity: 0.85 },
  'Whole Foods': { entityId: 'urn:qloo:entity:brand:whole_foods', popularity: 0.92 },
  'Sweetgreen': { entityId: 'urn:qloo:entity:brand:sweetgreen', popularity: 0.78 },
  'Lululemon': { entityId: 'urn:qloo:entity:brand:lululemon', popularity: 0.88 },
  'Madewell': { entityId: 'urn:qloo:entity:brand:madewell', popularity: 0.71 },
  'Everlane': { entityId: 'urn:qloo:entity:brand:everlane', popularity: 0.65 },
  'Reformation': { entityId: 'urn:qloo:entity:brand:reformation', popularity: 0.69 },
  'Aritzia': { entityId: 'urn:qloo:entity:brand:aritzia', popularity: 0.72 },
  'Bluemercury': { entityId: 'urn:qloo:entity:brand:bluemercury', popularity: 0.58 },
  'REI': { entityId: 'urn:qloo:entity:brand:rei', popularity: 0.81 },
  'Warby Parker': { entityId: 'urn:qloo:entity:brand:warby_parker', popularity: 0.74 },
  'Blue Bottle Coffee': { entityId: 'urn:qloo:entity:brand:blue_bottle_coffee', popularity: 0.66 },
} as const;

/**
 * Store location data for absence verification
 * Subset of All The Places data used in validation
 */
export interface StoreLocation {
  lat: number;
  lon: number;
}

export const STORE_LOCATIONS: Record<string, StoreLocation[]> = {
  'trader_joes': [],
  'whole_foods': [],
  'sweetgreen': [],
  'lululemon': [],
  'rei': [],
};

export * from './wicker-park';
export * from './sevierville';
export * from './boulder';
