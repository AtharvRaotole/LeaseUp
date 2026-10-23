import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(lat, lon, precision = 3) {
  let idx = 0;
  let bit = 0;
  let even = true;
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let hash = '';
  while (hash.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        idx = idx * 2 + 1;
        lonMin = mid;
      } else {
        idx = idx * 2;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
        latMax = mid;
      }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Decode legacy micro-degree rows stored before Oct 2026 tile fix. */
export function tileStoreCoords(lat, lon) {
  if (Math.abs(lat) > 90) return [lat / 1e5, lon / 1e5];
  if (Math.abs(lon) > 180) return [lat, lon / 1e5];
  return [lat, lon];
}

export function coveringGeohash3(lat, lon, radiusKm) {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const hashes = new Set();
  const steps = 3;
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const tLat = lat - latDelta + (2 * latDelta * i) / steps;
      const tLon = lon - lonDelta + (2 * lonDelta * j) / steps;
      hashes.add(encodeGeohash(tLat, tLon, 3));
    }
  }
  return [...hashes];
}

export function loadTileCatalog(tilesDir) {
  const brandsPath = join(tilesDir, 'brands.json');
  if (!existsSync(brandsPath)) {
    throw new Error(`Missing ${brandsPath}`);
  }
  const brandsDoc = JSON.parse(readFileSync(brandsPath, 'utf8'));
  const brands = brandsDoc.brands;
  const brandIdToIdx = new Map(brands.map((b, i) => [b.id, i]));
  const tileCache = new Map();

  function loadTile(gh) {
    if (tileCache.has(gh)) return tileCache.get(gh);
    const path = join(tilesDir, `${gh}.json`);
    if (!existsSync(path)) {
      tileCache.set(gh, null);
      return null;
    }
    const tile = JSON.parse(readFileSync(path, 'utf8'));
    tileCache.set(gh, tile);
    return tile;
  }

  function nearestStoreKm(brandId, lat, lon, radiusKm) {
    const brandIdx = brandIdToIdx.get(brandId);
    if (brandIdx === undefined) return undefined;
    let nearest = Infinity;
    for (const gh of coveringGeohash3(lat, lon, radiusKm)) {
      const tile = loadTile(gh);
      if (!tile?.stores) continue;
      for (const [bIdx, rawLat, rawLon] of tile.stores) {
        if (bIdx !== brandIdx) continue;
        const [tLat, tLon] = tileStoreCoords(rawLat, rawLon);
        const d = haversineKm(lat, lon, tLat, tLon);
        if (d <= radiusKm && d < nearest) nearest = d;
      }
    }
    return nearest === Infinity ? undefined : nearest;
  }

  return { brands, nearestStoreKm };
}
