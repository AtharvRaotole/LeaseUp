import { coveringGeohash3 } from '../lib/geohash';
import type { ResponseCache } from '../lib/response-cache';
import {
  OSM_SNAPSHOT_BRAND_STATUS,
  OSM_SNAPSHOT_RECORDED_AT,
} from '../data/osm-snapshot-meta';

type BrandsIndex = {
  recordedAt?: string;
  brands: Array<{ id: string; name: string; qid: string; count: number }>;
};

type TilePayload = { gh: string; stores: Array<[number, number, number]> };

export type OsmSnapshotBrandStatus = 'ok' | 'failed' | 'missing';

function formatSnapshotDateUtc(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

export function osmSnapshotDisplayLabel(): string {
  return `OpenStreetMap snapshot, ${formatSnapshotDateUtc(OSM_SNAPSHOT_RECORDED_AT)}`;
}

export function osmSnapshotRecordedAt(): string {
  return OSM_SNAPSHOT_RECORDED_AT;
}

export function osmSnapshotBrandStatus(entityId: string): OsmSnapshotBrandStatus {
  return OSM_SNAPSHOT_BRAND_STATUS[entityId] ?? 'missing';
}

/** True when the snapshot has Wikidata fetch ok and at least one tiled store point. */
export function osmSnapshotBrandUsable(entityId: string, nationalOsmCount: number): boolean {
  return osmSnapshotBrandStatus(entityId) === 'ok' && nationalOsmCount > 0;
}

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

export class OsmSnapshotCatalog {
  private assets: Fetcher;
  private cache: ResponseCache;
  private brandsIndex: BrandsIndex | null = null;
  private tileMemory = new Map<string, TilePayload>();

  constructor(assets: Fetcher, cache: ResponseCache) {
    this.assets = assets;
    this.cache = cache;
  }

  private async loadBrandsIndex(): Promise<BrandsIndex | null> {
    if (this.brandsIndex) return this.brandsIndex;
    const cached = (await this.cache.get('osm-tiles:brands', 'json')) as BrandsIndex | null;
    if (cached) {
      this.brandsIndex = cached;
      return cached;
    }
    const res = await this.assets.fetch('https://osm.local/osm-tiles/brands.json');
    if (!res.ok) return null;
    const data = (await res.json()) as BrandsIndex;
    this.brandsIndex = data;
    await this.cache.putJsonIfChanged('osm-tiles:brands', data, 86400);
    return data;
  }

  private async loadTile(gh: string): Promise<TilePayload | null> {
    if (this.tileMemory.has(gh)) return this.tileMemory.get(gh)!;
    const kvKey = `osm-tiles:${gh}`;
    const cached = (await this.cache.get(kvKey, 'json')) as TilePayload | null;
    if (cached) {
      this.tileMemory.set(gh, cached);
      return cached;
    }
    const res = await this.assets.fetch(`https://osm.local/osm-tiles/${gh}.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as TilePayload;
    this.tileMemory.set(gh, data);
    await this.cache.putJsonIfChanged(kvKey, data, 86400);
    return data;
  }

  async getNationalStoreCount(brandId: string): Promise<number> {
    const index = await this.loadBrandsIndex();
    if (!index) return 0;
    return index.brands.find((b) => b.id === brandId)?.count ?? 0;
  }

  async nearestStoreKm(
    brandId: string,
    lat: number,
    lon: number,
    maxRadiusKm: number
  ): Promise<number | undefined> {
    if (osmSnapshotBrandStatus(brandId) !== 'ok') return undefined;
    const index = await this.loadBrandsIndex();
    if (!index) return undefined;
    const brandRow = index.brands.find((b) => b.id === brandId);
    if (!brandRow || brandRow.count <= 0) return undefined;
    const brandIdx = index.brands.findIndex((b) => b.id === brandId);
    if (brandIdx < 0) return undefined;

    let nearest = Infinity;
    const tiles = coveringGeohash3(lat, lon, maxRadiusKm);
    for (const gh of tiles) {
      const tile = await this.loadTile(gh);
      if (!tile) continue;
      for (const [bIdx, tLat, tLon] of tile.stores) {
        if (bIdx !== brandIdx) continue;
        const d = haversineKm(lat, lon, tLat, tLon);
        if (d <= maxRadiusKm && d < nearest) nearest = d;
      }
    }
    return nearest === Infinity ? undefined : nearest;
  }

  async hasBrandNearby(
    brandId: string,
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<boolean> {
    const nearest = await this.nearestStoreKm(brandId, lat, lon, radiusKm);
    return nearest !== undefined;
  }

  /** Distinct tracked brands with a snapshot store within radius (closest point per brand). */
  async listNearbyTenants(
    lat: number,
    lon: number,
    radiusKm: number,
    limit = 24
  ): Promise<Array<{ entityId: string; name: string; distanceKm: number }>> {
    const index = await this.loadBrandsIndex();
    if (!index) return [];

    const best = new Map<string, number>();
    const tiles = coveringGeohash3(lat, lon, radiusKm);
    for (const gh of tiles) {
      const tile = await this.loadTile(gh);
      if (!tile) continue;
      for (const [bIdx, tLat, tLon] of tile.stores) {
        const brand = index.brands[bIdx];
        if (!brand) continue;
        if (osmSnapshotBrandStatus(brand.id) !== 'ok') continue;
        const d = haversineKm(lat, lon, tLat, tLon);
        if (d > radiusKm) continue;
        const prev = best.get(brand.id);
        if (prev === undefined || d < prev) best.set(brand.id, d);
      }
    }

    return [...best.entries()]
      .map(([entityId, distanceKm]) => {
        const row = index.brands.find((b) => b.id === entityId);
        return {
          entityId,
          name: row?.name ?? entityId,
          distanceKm: Math.round(distanceKm * 100) / 100,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }
}
