import {
  findStoresNearby as demoFindStoresNearby,
  getNationalStoreCount as demoGetNationalStoreCount,
  getStoreBrandIds as demoGetStoreBrandIds,
} from '@leaseup/fixtures';
import { TRACKED_BRAND_IDS } from '../data/tracked-brand-ids';

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
  hasD1Stores(): Promise<boolean>;
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

  async hasD1Stores(): Promise<boolean> {
    return false;
  }
}

export class D1StoreCatalog implements StoreCatalog {
  private db: D1Database;
  private demoFallback: DemoStoreCatalog;

  constructor(db: D1Database) {
    this.db = db;
    this.demoFallback = new DemoStoreCatalog();
  }

  getBrandIds(): string[] {
    return TRACKED_BRAND_IDS;
  }

  async hasD1Stores(): Promise<boolean> {
    const row = await this.db
      .prepare('SELECT COUNT(*) as c FROM stores LIMIT 1')
      .first<{ c: number }>();
    return (row?.c ?? 0) > 0;
  }

  async findStoresNearby(
    brandId: string,
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<NearbyStore[]> {
    if (!(await this.hasD1Stores())) {
      return this.demoFallback.findStoresNearby(brandId, lat, lon, radiusKm);
    }

    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const rows = await this.db
      .prepare(
        `SELECT lat, lon FROM stores
         WHERE brand_id = ?
           AND lat BETWEEN ? AND ?
           AND lon BETWEEN ? AND ?`
      )
      .bind(brandId, lat - latDelta, lat + latDelta, lon - lonDelta, lon + lonDelta)
      .all<{ lat: number; lon: number }>();

    const nearby: NearbyStore[] = [];
    for (const row of rows.results ?? []) {
      const distance = haversineKm(lat, lon, row.lat, row.lon);
      if (distance <= radiusKm) {
        nearby.push({ lat: row.lat, lon: row.lon, distance });
      }
    }
    nearby.sort((a, b) => a.distance - b.distance);
    return nearby;
  }

  async getNationalStoreCount(brandId: string): Promise<number> {
    if (!(await this.hasD1Stores())) {
      return this.demoFallback.getNationalStoreCount(brandId);
    }
    const row = await this.db
      .prepare('SELECT store_count FROM brands WHERE brand_id = ?')
      .bind(brandId)
      .first<{ store_count: number }>();
    return row?.store_count ?? 0;
  }
}

export function createStoreCatalog(db: D1Database, mode: 'live' | 'demo'): StoreCatalog {
  return mode === 'live' ? new D1StoreCatalog(db) : new DemoStoreCatalog();
}
