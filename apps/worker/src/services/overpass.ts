/**
 * OSM Overpass API client for second-source absence verification
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import { matchDemoFixtureId, overpassDemoByFixture } from '@leaseup/fixtures';

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

export interface OverpassBrand {
  name: string;
  brand?: string;
  brandWikidata?: string;
  lat: number;
  lon: number;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export class OverpassClient {
  private cache: KVNamespace;
  private timeout: number;
  private demoMode: boolean;

  constructor(cache: KVNamespace, timeout: number = 8000, demoMode = false) {
    this.cache = cache;
    this.timeout = timeout;
    this.demoMode = demoMode;
  }

  /**
   * Query branded retail locations within radius (single batched request).
   */
  async queryBrands(
    lat: number,
    lng: number,
    radiusKm: number,
    addressForDemo?: string
  ): Promise<{ brands: OverpassBrand[]; cached: boolean; error?: string }> {
    if (this.demoMode && addressForDemo) {
      const fixtureId = matchDemoFixtureId(addressForDemo);
      if (fixtureId && overpassDemoByFixture[fixtureId]) {
        return {
          brands: overpassDemoByFixture[fixtureId].brands,
          cached: true,
        };
      }
    }

    const cacheKey = `overpass:${lat.toFixed(4)},${lng.toFixed(4)}:${radiusKm}`;

    const cached = await this.cache.get(cacheKey, 'json') as OverpassResponse | null;
    if (cached) {
      return {
        brands: this.parseResponse(cached),
        cached: true,
      };
    }

    const radiusMeters = Math.round(radiusKm * 1000);
    const query = `
      [out:json][timeout:${Math.max(1, Math.floor(this.timeout / 1000) - 1)}];
      (
        node["brand"](around:${radiusMeters},${lat},${lng});
        way["brand"](around:${radiusMeters},${lat},${lng});
        node["brand:wikidata"](around:${radiusMeters},${lat},${lng});
        way["brand:wikidata"](around:${radiusMeters},${lat},${lng});
      );
      out center tags 200;
    `.trim();

    for (const baseUrl of OVERPASS_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'LeaseUp/1.0 (hackathon@qloo.com)',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          continue;
        }

        const data = await response.json() as OverpassResponse;

        await this.cache.put(cacheKey, JSON.stringify(data), {
          expirationTtl: 86400,
        });

        return {
          brands: this.parseResponse(data),
          cached: false,
        };
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return { brands: [], cached: false, error: 'timeout' };
        }
      }
    }

    return { brands: [], cached: false, error: 'overpass_unavailable' };
  }

  private parseResponse(data: OverpassResponse): OverpassBrand[] {
    const brands: OverpassBrand[] = [];

    for (const element of data.elements) {
      if (!element.tags) continue;

      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;

      if (!lat || !lon) continue;

      const brand = element.tags['brand'];
      const brandWikidata = element.tags['brand:wikidata'];
      const name = element.tags['name'];

      if (!brand && !name) continue;

      brands.push({
        name: name || brand || 'Unknown',
        brand,
        brandWikidata,
        lat,
        lon,
      });
    }

    return brands;
  }
}
