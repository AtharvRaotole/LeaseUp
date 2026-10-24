import { vi } from 'vitest';
import { getStoreBrandIds } from '@leaseup/fixtures';

/** Non-demo chip address (live geocode + Qloo point radius). */
export const COLD_ANALYZE_ADDRESS = '1 Commerce St, Austin, TX 78701';

export type ColdAnalyzeFetchStats = {
  qlooHttp: number;
  overpassHttp: number;
  nominatimHttp: number;
};

export function installColdAnalyzeFetchMock(options: {
  qlooDelayMs: number;
  coldLat: number;
  coldLon: number;
}): ColdAnalyzeFetchStats {
  const stats: ColdAnalyzeFetchStats = {
    qlooHttp: 0,
    overpassHttp: 0,
    nominatimHttp: 0,
  };

  const brandIds = getStoreBrandIds();
  const entities = brandIds.map((entity_id, index) => ({
    entity_id,
    name: `Brand ${index}`,
    query: { affinity: 0.5 + (index % 50) / 100, affinity_rank: 0.5 + (index % 50) / 100 },
  }));

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('nominatim.openstreetmap.org')) {
        stats.nominatimHttp += 1;
        return {
          ok: true,
          json: async () => [
            {
              lat: String(options.coldLat),
              lon: String(options.coldLon),
              display_name: '1 Commerce St, Austin, TX 78701, United States',
              address: { city: 'Austin', state: 'Texas' },
            },
          ],
        };
      }
      if (url.includes('overpass')) {
        stats.overpassHttp += 1;
        await delay(5);
        return { ok: true, json: async () => ({ elements: [] }) };
      }
      if (url.includes('/v2/insights')) {
        stats.qlooHttp += 1;
        await delay(options.qlooDelayMs);
        const decoded = decodeURIComponent(url);
        if (decoded.includes('filter.type=urn%3Atag') && !decoded.includes('filter.results.entities')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: {
                entities: [{ entity_id: 'tag-1', name: 'Coffee', query: { affinity: 0.8 } }],
              },
            }),
          };
        }
        if (decoded.includes('urn%3Aaudience') || decoded.includes('urn%3Atag')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: {
                entities: [{ entity_id: 'exp-1', name: 'Fit', query: { affinity: 0.7 } }],
              },
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: { entities } }),
        };
      }
      return { ok: false, status: 404 };
    })
  );

  return stats;
}
