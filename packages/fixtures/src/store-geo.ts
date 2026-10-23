import storeLocations from './store-locations.json';

interface BrandData {
  name: string;
  slug: string;
  count: number;
  locations: number[][];
}

type StoreData = Record<string, BrandData>;

const storeData = storeLocations.data as StoreData;

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

export function getNationalStoreCount(brandId: string): number {
  return storeData[brandId]?.count || 0;
}

export function getStoreBrandIds(): string[] {
  return Object.keys(storeData);
}

export function getStoreBrandIdSet(): Set<string> {
  return new Set(getStoreBrandIds());
}

/** Nearest ATP store for a brand to a point (any distance). */
export function nearestStoreDistanceKm(
  brandId: string,
  lat: number,
  lon: number
): number | undefined {
  const brand = storeData[brandId];
  if (!brand) return undefined;

  let min = Infinity;
  for (const location of brand.locations) {
    const [storeLat, storeLon] = location;
    if (storeLat === undefined || storeLon === undefined) continue;
    const distance = haversineDistance(lat, lon, storeLat, storeLon);
    if (distance < min) min = distance;
  }

  return min === Infinity ? undefined : min;
}

export function mapStoresForTopBrands(
  brandIds: string[],
  brandNames: Record<string, string>,
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  maxPerBrand = 3
): Array<{
  entityId: string;
  brandName: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}> {
  const points: Array<{
    entityId: string;
    brandName: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
  }> = [];

  for (const entityId of brandIds) {
    const nearby = findStoresNearby(entityId, centerLat, centerLon, radiusKm).slice(0, maxPerBrand);
    for (const store of nearby) {
      points.push({
        entityId,
        brandName: brandNames[entityId] || entityId,
        latitude: store.lat,
        longitude: store.lon,
        distanceKm: store.distance,
      });
    }
  }

  return points;
}
