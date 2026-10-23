import {
  findStoresNearby as demoFindStoresNearby,
  getNationalStoreCount as demoGetNationalStoreCount,
  getStoreBrandIds as demoGetStoreBrandIds,
} from '@leaseup/fixtures/worker';
import { TRACKED_BRAND_IDS } from '../data/tracked-brand-ids';
import { coveringGeohash3 } from '../lib/geohash';

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
      return `ATP snapshot may under-count this chain (${nationalCount} US points in our extract). Treat absence as preliminary.`;
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
  private cache: KVNamespace;
  private brandsIndex: BrandsIndex | null = null;
  private tileMemory = new Map<string, TilePayload>();
  private demoFallback = new DemoStoreCatalog();

  constructor(assets: Fetcher, cache: KVNamespace) {
    this.assets = assets;
    this.cache = cache;
  }

  getBrandIds(): string[] {
    return TRACKED_BRAND_IDS;
  }

  private async loadBrandsIndex(): Promise<BrandsIndex> {
    if (this.brandsIndex) return this.brandsIndex;
    const cached = await this.cache.get('tiles:brands', 'json') as BrandsIndex | null;
    if (cached) {
      this.brandsIndex = cached;
      return cached;
    }
    const res = await this.assets.fetch('https://tiles.local/tiles/brands.json');
    if (!res.ok) {
      throw new Error(`Failed to load brands.json (${res.status})`);
    }
    const data = (await res.json()) as BrandsIndex;
    this.brandsIndex = data;
    await this.cache.put('tiles:brands', JSON.stringify(data), { expirationTtl: 86400 });
    return data;
  }

  private async loadTile(gh: string): Promise<TilePayload | null> {
    if (this.tileMemory.has(gh)) {
      return this.tileMemory.get(gh)!;
    }
    const kvKey = `tiles:${gh}`;
    const cached = await this.cache.get(kvKey, 'json') as TilePayload | null;
    if (cached) {
      this.tileMemory.set(gh, cached);
      return cached;
    }
    const res = await this.assets.fetch(`https://tiles.local/tiles/${gh}.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as TilePayload;
    this.tileMemory.set(gh, data);
    await this.cache.put(kvKey, JSON.stringify(data), { expirationTtl: 86400 });
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
      return `ATP snapshot may under-count this chain (${nationalCount} US points). Absence is not confirmed without OpenStreetMap.`;
    }
    return undefined;
  }
}

export function createStoreCatalog(
  env: { ASSETS?: Fetcher; CACHE: KVNamespace },
  mode: 'live' | 'demo'
): StoreCatalog {
  if (mode === 'live' && env.ASSETS) {
    return new GeoTileStoreCatalog(env.ASSETS, env.CACHE);
  }
  return new DemoStoreCatalog();
}
