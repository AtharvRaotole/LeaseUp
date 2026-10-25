import { meterSubrequest } from '../lib/subrequest-meter';
import { loadStaticAssetJson } from '../lib/static-asset-memo';
import type { NearbyTenant } from '@leaseup/contracts';
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
  private brandsIndex: BrandsIndex | null = null;
  private brandsIndexLoad: Promise<BrandsIndex | null> | null = null;
  private tileMemory = new Map<string, TilePayload>();
  private tileLoads = new Map<string, Promise<TilePayload | null>>();

  /** The response cache argument is kept for callers; static tiles no longer use the Cache API. */
  constructor(assets: Fetcher, _cache?: ResponseCache) {
    this.assets = assets;
  }

  private loadBrandsIndex(): Promise<BrandsIndex | null> {
    if (this.brandsIndex) return Promise.resolve(this.brandsIndex);
    if (this.brandsIndexLoad) return this.brandsIndexLoad;
    this.brandsIndexLoad = this.fetchBrandsIndex().finally(() => {
      this.brandsIndexLoad = null;
    });
    return this.brandsIndexLoad;
  }

  private async fetchBrandsIndex(): Promise<BrandsIndex | null> {
    const data = await loadStaticAssetJson<BrandsIndex>(this.assets, 'osm-tiles:brands', async () => {
      meterSubrequest('assets');
      const res = await this.assets.fetch('https://osm.local/osm-tiles/brands.json');
      if (!res.ok) return null;
      return (await res.json()) as BrandsIndex;
    });
    if (data) this.brandsIndex = data;
    return data;
  }

  private loadTile(gh: string): Promise<TilePayload | null> {
    const mem = this.tileMemory.get(gh);
    if (mem) return Promise.resolve(mem);
    const inflight = this.tileLoads.get(gh);
    if (inflight) return inflight;
    const promise = this.fetchTile(gh).finally(() => {
      this.tileLoads.delete(gh);
    });
    this.tileLoads.set(gh, promise);
    return promise;
  }

  private async fetchTile(gh: string): Promise<TilePayload | null> {
    const data = await loadStaticAssetJson<TilePayload>(this.assets, `osm-tiles:${gh}`, async () => {
      meterSubrequest('assets');
      const res = await this.assets.fetch(`https://osm.local/osm-tiles/${gh}.json`);
      if (!res.ok) return null;
      return (await res.json()) as TilePayload;
    });
    if (data) this.tileMemory.set(gh, data);
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
  ): Promise<NearbyTenant[]> {
    const index = await this.loadBrandsIndex();
    if (!index) return [];

    const best = new Map<string, NearbyTenant>();
    for (const gh of coveringGeohash3(lat, lon, radiusKm)) {
      const tile = await this.loadTile(gh);
      for (const [bIdx, tLat, tLon] of tile?.stores ?? []) {
        const brand = index.brands[bIdx];
        if (!brand || osmSnapshotBrandStatus(brand.id) !== 'ok') continue;
        const distanceKm = Math.round(haversineKm(lat, lon, tLat, tLon) * 100) / 100;
        const prev = best.get(brand.id);
        if (distanceKm <= radiusKm && !(prev && prev.distanceKm <= distanceKm)) {
          best.set(brand.id, { entityId: brand.id, name: brand.name, distanceKm });
        }
      }
    }

    return [...best.values()]
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }
}
