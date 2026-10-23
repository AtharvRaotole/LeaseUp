import type { Location } from '@leaseup/contracts';
import type { StoreCatalog } from '../services/store-catalog';

export type NearbyStoreRow = { distance: number; lat: number; lon: number };

/**
 * One catalog pass per (brand, radius) per analyze request. Avoids repeated ATP/OSM work.
 */
export class NearbyPresenceCache {
  private readonly byBrandRadius = new Map<string, Map<number, NearbyStoreRow[]>>();

  constructor(
    private readonly catalog: StoreCatalog,
    private readonly location: Location
  ) {}

  async storesNearby(brandId: string, radiusKm: number): Promise<NearbyStoreRow[]> {
    let byRadius = this.byBrandRadius.get(brandId);
    if (!byRadius) {
      byRadius = new Map();
      this.byBrandRadius.set(brandId, byRadius);
    }
    const cached = byRadius.get(radiusKm);
    if (cached) return cached;

    const rows = await this.catalog.findStoresNearby(
      brandId,
      this.location.latitude,
      this.location.longitude,
      radiusKm
    );
    const mapped = rows.map((s) => ({ distance: s.distance, lat: s.lat, lon: s.lon }));
    byRadius.set(radiusKm, mapped);
    return mapped;
  }

  findNearbyFn(radiusKm: number) {
    return (brandId: string, _lat: number, _lon: number, _r: number) =>
      this.byBrandRadius.get(brandId)?.get(radiusKm) ?? [];
  }

  async warmBrandRadii(
    brandIds: Iterable<string>,
    radiiKm: number[]
  ): Promise<void> {
    const uniqueRadii = [...new Set(radiiKm)];
    for (const brandId of brandIds) {
      for (const r of uniqueRadii) {
        await this.storesNearby(brandId, r);
      }
    }
  }
}
