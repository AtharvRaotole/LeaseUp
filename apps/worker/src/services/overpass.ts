/**
 * OSM Overpass API client for second-source absence verification
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import { matchDemoFixtureId, overpassDemoByFixture } from '@leaseup/fixtures';
import { encodeGeohash } from '../lib/geohash';
import {
  buildProspectOverpassQuery,
  type OverpassSearchBrand,
} from '../lib/overpass-query';

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
  'https://overpass.private.coffee/api/interpreter',
];

const CACHE_TTL_SEC = 7 * 86400;

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
   * Query OSM for only the given prospect brands (single batched request).
   */
  async queryProspectBrands(
    lat: number,
    lng: number,
    radiusKm: number,
    brands: OverpassSearchBrand[],
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

    const gh5 = encodeGeohash(lat, lng, 5);
    const brandKey = await hashBrandSet(brands);
    const cacheKey = `overpass:v2:${brandKey}:${gh5}:${radiusKm}`;

    const cached = await this.cache.get(cacheKey, 'json') as OverpassResponse | null;
    if (cached) {
      return {
        brands: this.parseResponse(cached),
        cached: true,
      };
    }

    const query = buildProspectOverpassQuery(lat, lng, radiusKm, brands);

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
          expirationTtl: CACHE_TTL_SEC,
        });

        return {
          brands: this.parseResponse(data),
          cached: false,
        };
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          continue;
        }
      }
    }

    return { brands: [], cached: false, error: 'overpass_unavailable' };
  }

  /** @deprecated Use queryProspectBrands with an explicit brand list. */
  async queryBrands(
    lat: number,
    lng: number,
    radiusKm: number,
    addressForDemo?: string,
    brands: OverpassSearchBrand[] = []
  ): Promise<{ brands: OverpassBrand[]; cached: boolean; error?: string }> {
    return this.queryProspectBrands(lat, lng, radiusKm, brands, addressForDemo);
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

async function hashBrandSet(brands: OverpassSearchBrand[]): Promise<string> {
  const payload = brands
    .map((b) => `${b.entityId}:${b.name}:${b.wikidata ?? ''}`)
    .sort()
    .join('|');
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 16);
}
