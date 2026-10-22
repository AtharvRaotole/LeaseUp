/**
 * Demo fixtures from REAL Qloo validation data
 * Source: round2/neigh_test_10km.json (actual API responses from Oct 2026)
 * Store locations: All The Places (CC0 license, Oct 2026 snapshot)
 * 
 * To regenerate: node scripts/build-fixtures.mjs
 */

export { wickerparkFixture } from './wicker-park';
export { boulderFixture } from './boulder';
export { seviervilleFixture } from './sevierville';

import storeLocations from './store-locations.json';

export { storeLocations };

interface BrandData {
  name: string;
  slug: string;
  count: number;
  locations: number[][];
}

type StoreData = Record<string, BrandData>;

const storeData = storeLocations.data as StoreData;

/**
 * Haversine distance in km between two lat/lon points
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find stores within radius of a location
 */
export function findStoresNearby(
  brandId: string,
  lat: number,
  lon: number,
  radiusKm: number
): Array<{ lat: number; lon: number; distance: number }> {
  const brand = storeData[brandId];
  if (!brand) return [];

  const nearby = [];
  for (const location of brand.locations) {
    const [storeLat, storeLon] = location;
    if (storeLat === undefined || storeLon === undefined) continue;
    
    const distance = haversineDistance(lat, lon, storeLat, storeLon);
    if (distance <= radiusKm) {
      nearby.push({ lat: storeLat, lon: storeLon, distance });
    }
  }

  return nearby.sort((a, b) => a.distance - b.distance);
}

/**
 * Get national store count for a brand
 */
export function getNationalStoreCount(brandId: string): number {
  return storeData[brandId]?.count || 0;
}
