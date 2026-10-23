/**
 * OSM Overpass API client for second-source absence verification
 * 
 * Queries OpenStreetMap for branded retail locations within a radius.
 * Used as a second source to verify absence detected by All The Places dataset.
 * 
 * Rate limits: ~2 req/s per IP, timeout 180s server-side
 * Caches responses in KV with 24h TTL
 */

import type { KVNamespace } from '@cloudflare/workers-types';

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

export class OverpassClient {
  private baseUrl: string;
  private cache: KVNamespace;
  private timeout: number;

  constructor(cache: KVNamespace, timeout: number = 5000) {
    this.baseUrl = 'https://overpass-api.de/api/interpreter';
    this.cache = cache;
    this.timeout = timeout;
  }

  /**
   * Query for branded retail locations within radius
   * 
   * Searches for nodes/ways with brand, brand:wikidata, or name tags.
   * Implements request timeout, KV caching (24h), and graceful error handling.
   */
  async queryBrands(
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<{ brands: OverpassBrand[]; cached: boolean; error?: string }> {
    const cacheKey = `overpass:${lat.toFixed(4)},${lng.toFixed(4)}:${radiusKm}`;
    
    // Check cache first (24h TTL)
    const cached = await this.cache.get(cacheKey, 'json') as OverpassResponse | null;
    if (cached) {
      return {
        brands: this.parseResponse(cached),
        cached: true,
      };
    }

    // Build Overpass query (QL format)
    // Query branded retail POIs (nodes and ways) within radius
    const radiusMeters = radiusKm * 1000;
    const query = `
      [out:json][timeout:${Math.floor(this.timeout / 1000)}];
      (
        node["brand"](around:${radiusMeters},${lat},${lng});
        way["brand"](around:${radiusMeters},${lat},${lng});
        node["brand:wikidata"](around:${radiusMeters},${lat},${lng});
        way["brand:wikidata"](around:${radiusMeters},${lat},${lng});
      );
      out center tags ${Math.min(50, radiusKm * 5)};
    `.trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.baseUrl, {
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
        const statusText = `${response.status} ${response.statusText}`;
        console.warn(`Overpass API error: ${statusText}`);
        return {
          brands: [],
          cached: false,
          error: statusText,
        };
      }

      const data = await response.json() as OverpassResponse;
      
      // Cache successful response (24h TTL)
      await this.cache.put(cacheKey, JSON.stringify(data), {
        expirationTtl: 86400, // 24 hours
      });

      return {
        brands: this.parseResponse(data),
        cached: false,
      };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        console.warn('Overpass API timeout');
        return {
          brands: [],
          cached: false,
          error: 'timeout',
        };
      }
      
      console.warn('Overpass API fetch error:', (err as Error).message);
      return {
        brands: [],
        cached: false,
        error: (err as Error).message,
      };
    }
  }

  private parseResponse(data: OverpassResponse): OverpassBrand[] {
    const brands: OverpassBrand[] = [];

    for (const element of data.elements) {
      if (!element.tags) continue;

      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;
      
      if (!lat || !lon) continue;

      // Extract brand info from tags
      const brand = element.tags['brand'];
      const brandWikidata = element.tags['brand:wikidata'];
      const name = element.tags['name'];

      // Must have at least brand or name
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
