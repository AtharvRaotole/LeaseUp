/** Minimal geohash encode (precision 1–12) for tile keys. */
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(latitude: number, longitude: number, precision = 3): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let hash = '';

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude >= mid) {
        idx = idx * 2 + 1;
        lonMin = mid;
      } else {
        idx = idx * 2;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
        latMax = mid;
      }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      hash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

/** Geohash-3 cells that may intersect a circle (center + radius km). */
export function coveringGeohash3(lat: number, lon: number, radiusKm: number): string[] {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const samples: Array<[number, number]> = [
    [lat, lon],
    [lat + latDelta, lon],
    [lat - latDelta, lon],
    [lat, lon + lonDelta],
    [lat, lon - lonDelta],
    [lat + latDelta, lon + lonDelta],
    [lat + latDelta, lon - lonDelta],
    [lat - latDelta, lon + lonDelta],
    [lat - latDelta, lon - lonDelta],
  ];
  const set = new Set<string>();
  for (const [la, lo] of samples) {
    set.add(encodeGeohash(la, lo, 3));
  }
  return [...set];
}
