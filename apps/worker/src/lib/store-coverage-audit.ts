import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { coveringGeohash3 } from './geohash';

type ExpandedBrand = { name: string; locations: Array<[number, number]> };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function tileStoreCoords(lat: number, lon: number): [number, number] {
  if (Math.abs(lat) > 90) return [lat / 1e5, lon / 1e5];
  if (Math.abs(lon) > 180) return [lat, lon / 1e5];
  return [lat, lon];
}

type SupplementRow = {
  brandId: string;
  lat: number;
  lon: number;
  targets?: string[];
};

export function loadTileCatalogFromPaths(paths: {
  atpExpandedPath: string;
  osmTilesDir: string;
  supplementsPath?: string;
}) {
  const atpExpanded = JSON.parse(readFileSync(paths.atpExpandedPath, 'utf8')).data as Record<
    string,
    ExpandedBrand
  >;

  const supplements: SupplementRow[] = paths.supplementsPath && existsSync(paths.supplementsPath)
    ? (JSON.parse(readFileSync(paths.supplementsPath, 'utf8')).stores ?? [])
    : [];

  const osmBrandsPath = join(paths.osmTilesDir, 'brands.json');
  const osmBrands = JSON.parse(readFileSync(osmBrandsPath, 'utf8')).brands as Array<{
    id: string;
  }>;
  const osmBrandIdx = new Map(osmBrands.map((b, i) => [b.id, i]));
  const osmTileCache = new Map<string, { stores: Array<[number, number, number]> } | null>();

  function loadOsmTile(gh: string) {
    if (osmTileCache.has(gh)) return osmTileCache.get(gh)!;
    const file = join(paths.osmTilesDir, `${gh}.json`);
    if (!existsSync(file)) {
      osmTileCache.set(gh, null);
      return null;
    }
    const tile = JSON.parse(readFileSync(file, 'utf8')) as { stores: Array<[number, number, number]> };
    osmTileCache.set(gh, tile);
    return tile;
  }

  function nearestAtpKm(brandId: string, lat: number, lon: number, radiusKm: number): number | undefined {
    const row = atpExpanded[brandId];
    let nearest = Infinity;
    if (row?.locations) {
      for (const [tLat, tLon] of row.locations) {
        const d = haversineKm(lat, lon, tLat, tLon);
        if (d <= radiusKm && d < nearest) nearest = d;
      }
    }
    for (const sup of supplements) {
      if (sup.brandId !== brandId) continue;
      const targets = sup.targets ?? ['atp', 'osm', 'osmData'];
      if (!targets.includes('atp')) continue;
      const d = haversineKm(lat, lon, sup.lat, sup.lon);
      if (d <= radiusKm && d < nearest) nearest = d;
    }
    return nearest === Infinity ? undefined : nearest;
  }

  function nearestOsmKm(brandId: string, lat: number, lon: number, radiusKm: number): number | undefined {
    const brandIdx = osmBrandIdx.get(brandId);
    if (brandIdx === undefined) return undefined;
    let nearest = Infinity;
    for (const gh of coveringGeohash3(lat, lon, radiusKm)) {
      const tile = loadOsmTile(gh);
      if (!tile?.stores) continue;
      for (const [bIdx, rawLat, rawLon] of tile.stores) {
        if (bIdx !== brandIdx) continue;
        const [tLat, tLon] = tileStoreCoords(rawLat, rawLon);
        const d = haversineKm(lat, lon, tLat, tLon);
        if (d <= radiusKm && d < nearest) nearest = d;
      }
    }
    for (const sup of supplements) {
      if (sup.brandId !== brandId) continue;
      const targets = sup.targets ?? ['atp', 'osm', 'osmData'];
      if (!targets.includes('osm') && !targets.includes('osmData')) continue;
      const d = haversineKm(lat, lon, sup.lat, sup.lon);
      if (d <= radiusKm && d < nearest) nearest = d;
    }
    return nearest === Infinity ? undefined : nearest;
  }

  return {
    nearestBothKm(brandId: string, lat: number, lon: number, radiusKm: number) {
      return {
        atpKm: nearestAtpKm(brandId, lat, lon, radiusKm),
        osmKm: nearestOsmKm(brandId, lat, lon, radiusKm),
      };
    },
  };
}
