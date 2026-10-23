import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OverpassClient } from '../services/overpass';
import boulderResponse from './fixtures/overpass-boulder-synthetic.json';
import wickerParkResponse from './fixtures/overpass-wicker-park-synthetic.json';
import emptyResponse from './fixtures/overpass-empty.json';

describe('OverpassClient', () => {
  let client: OverpassClient;
  let mockCache: KVNamespace;

  beforeEach(() => {
    mockCache = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    } as unknown as KVNamespace;

    client = new OverpassClient(mockCache, 5000);
  });

  describe('queryBrands', () => {
    it('returns cached response when available', async () => {
      vi.mocked(mockCache.get).mockResolvedValue(boulderResponse as never);

      const result = await client.queryBrands(40.0150, -105.2705, 10);

      expect(result.cached).toBe(true);
      expect(result.brands).toHaveLength(3);
      expect(result.brands[0]?.brand).toBe('Whole Foods Market');
    });

    it('parses Boulder Overpass response correctly', async () => {
      // Mock fetch to return recorded Boulder response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => boulderResponse,
      });

      const result = await client.queryBrands(40.0150, -105.2705, 10);

      expect(result.cached).toBe(false);
      expect(result.brands).toHaveLength(3);
      
      const wholeFoods = result.brands.find(b => b.brand === 'Whole Foods Market');
      expect(wholeFoods).toBeDefined();
      expect(wholeFoods?.brandWikidata).toBe('Q1809448');
      expect(wholeFoods?.lat).toBe(40.0180);
    });

    it('parses Wicker Park response with multiple brands', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => wickerParkResponse,
      });

      const result = await client.queryBrands(41.9105, -87.6769, 10);

      expect(result.brands).toHaveLength(2);
      expect(result.brands.map(b => b.brand)).toContain('Lululemon');
      expect(result.brands.map(b => b.brand)).toContain('Apple');
    });

    it('handles empty response (no brands in area)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => emptyResponse,
      });

      const result = await client.queryBrands(35.8684, -83.5619, 10);

      expect(result.brands).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('handles HTTP errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const result = await client.queryBrands(40.0, -105.0, 10);

      expect(result.brands).toHaveLength(0);
      expect(result.error).toBe('overpass_unavailable');
      expect(result.cached).toBe(false);
    });

    it('handles timeout with AbortController', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const result = await client.queryBrands(40.0, -105.0, 10);

      expect(result.brands).toHaveLength(0);
      expect(result.error).toBe('timeout');
    });

    it('handles network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const result = await client.queryBrands(40.0, -105.0, 10);

      expect(result.brands).toHaveLength(0);
      expect(result.error).toBe('overpass_unavailable');
    });

    it('caches successful responses with 24h TTL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => boulderResponse,
      });

      await client.queryBrands(40.0150, -105.2705, 10);

      expect(mockCache.put).toHaveBeenCalledWith(
        expect.stringContaining('overpass:40.0150'),
        expect.any(String),
        { expirationTtl: 86400 }
      );
    });

    it('extracts brands from nodes and ways with center', async () => {
      const responseWithWay = {
        ...boulderResponse,
        elements: [
          {
            type: 'way' as const,
            id: 999,
            center: { lat: 40.020, lon: -105.280 },
            tags: {
              brand: 'REI',
              'brand:wikidata': 'Q3414933',
              name: 'REI Co-op',
              shop: 'outdoor',
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => responseWithWay,
      });

      const result = await client.queryBrands(40.02, -105.28, 5);

      expect(result.brands).toHaveLength(1);
      expect(result.brands[0]?.brand).toBe('REI');
      expect(result.brands[0]?.lat).toBe(40.020);
    });
  });
});
