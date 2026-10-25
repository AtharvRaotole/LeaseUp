import { meterSubrequest } from '../lib/subrequest-meter';
import { loadStaticAssetJson } from '../lib/static-asset-memo';
import {
  findStoresNearby as demoFindStoresNearby,
  getNationalStoreCount as demoGetNationalStoreCount,
  getStoreBrandIds as demoGetStoreBrandIds,
} from '@leaseup/fixtures/worker';
import { TRACKED_BRAND_IDS } from '../data/tracked-brand-ids';
import { coveringGeohash3 } from '../lib/geohash';
import type { ResponseCache } from '../lib/response-cache';
import { getResponseCache } from '../lib/worker-cache';
import { catalogUnderCountNote, catalogUnderCountNoOsmNote } from '../lib/all-the-places-copy';

export interface NearbyStore {
  lat: number;
  lon: number;
  distance: number;
}

export interface StoreCatalog {
  getBrandIds(): string[];
  findStoresNearby(
    brandId: string,
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<NearbyStore[]>;
  getNationalStoreCount(brandId: string): Promise<number>;
  getCoverageNote(brandId: string, nationalCount: number): string | undefined;
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

const LOW_COVERAGE_THRESHOLD = 25;

export class DemoStoreCatalog implements StoreCatalog {
  getBrandIds(): string[] {
    return demoGetStoreBrandIds();
  }

  async findStoresNearby(
    brandId: string,
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<NearbyStore[]> {
    return demoFindStoresNearby(brandId, lat, lon, radiusKm);
  }

  async getNationalStoreCount(brandId: string): Promise<number> {
    return demoGetNationalStoreCount(brandId);
  }

  getCoverageNote(_brandId: string, nationalCount: number): string | undefined {
    if (nationalCount < LOW_COVERAGE_THRESHOLD) {
      return catalogUnderCountNote(nationalCount);
    }
    return undefined;
  }
}

type BrandsIndex = {
  brands: Array<{ id: string; name: string; displayName: string; count: number }>;
};

type TilePayload = { gh: string; stores: Array<[number, number, number]> };

export class GeoTileStoreCatalog implements StoreCatalog {
  private assets: Fetcher;
  private brandsIndex: BrandsIndex | null = null;
  private tileMemory = new Map<string, TilePayload>();
  private demoFallback = new DemoStoreCatalog();

  /** The response cache argument is kept for callers; static tiles no longer use the Cache API. */
  constructor(assets: Fetcher, _cache?: ResponseCache) {
    this.assets = assets;
  }

  getBrandIds(): string[] {
    return TRACKED_BRAND_IDS;
  }

  private async loadBrandsIndex(): Promise<BrandsIndex> {
    if (this.brandsIndex) return this.brandsIndex;
    const data = await loadStaticAssetJson<BrandsIndex>(this.assets, 'tiles:brands', async () => {
      meterSubrequest('assets');
      const res = await this.assets.fetch('https://tiles.local/tiles/brands.json');
      if (!res.ok) {
        throw new Error(`Failed to load brands.json (${res.status})`);
      }
      return (await res.json()) as BrandsIndex;
    });
    if (!data) throw new Error('Failed to load brands.json');
    this.brandsIndex = data;
    return data;
  }

  private async loadTile(gh: string): Promise<TilePayload | null> {
    if (this.tileMemory.has(gh)) {
      return this.tileMemory.get(gh)!;
    }
    const data = await loadStaticAssetJson<TilePayload>(this.assets, `tiles:${gh}`, async () => {
      meterSubrequest('assets');
      const res = await this.assets.fetch(`https://tiles.local/tiles/${gh}.json`);
      if (!res.ok) return null;
      return (await res.json()) as TilePayload;
    });
    if (data) this.tileMemory.set(gh, data);
    return data;
  }

  async findStoresNearby(
    brandId: string,
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<NearbyStore[]> {
    try {
      const index = await this.loadBrandsIndex();
      const brandIdx = index.brands.findIndex((b) => b.id === brandId);
      if (brandIdx < 0) return [];

      const tiles = coveringGeohash3(lat, lon, radiusKm);
      const nearby: NearbyStore[] = [];

      for (const gh of tiles) {
        const tile = await this.loadTile(gh);
        if (!tile) continue;
        for (const [bIdx, tLat, tLon] of tile.stores) {
          if (bIdx !== brandIdx) continue;
          const distance = haversineKm(lat, lon, tLat, tLon);
          if (distance <= radiusKm) {
            nearby.push({ lat: tLat, lon: tLon, distance });
          }
        }
      }

      nearby.sort((a, b) => a.distance - b.distance);
      return nearby;
    } catch {
      return this.demoFallback.findStoresNearby(brandId, lat, lon, radiusKm);
    }
  }

  async getNationalStoreCount(brandId: string): Promise<number> {
    try {
      const index = await this.loadBrandsIndex();
      const row = index.brands.find((b) => b.id === brandId);
      return row?.count ?? 0;
    } catch {
      return this.demoFallback.getNationalStoreCount(brandId);
    }
  }

  getCoverageNote(_brandId: string, nationalCount: number): string | undefined {
    if (nationalCount < LOW_COVERAGE_THRESHOLD) {
      return catalogUnderCountNoOsmNote(nationalCount);
    }
    return undefined;
  }
}

export function createStoreCatalog(
  env: { ASSETS?: Fetcher; CACHE: KVNamespace },
  mode: 'live' | 'demo'
): StoreCatalog {
  if (mode === 'live' && env.ASSETS) {
    return new GeoTileStoreCatalog(env.ASSETS, getResponseCache());
  }
  return new DemoStoreCatalog();
}
