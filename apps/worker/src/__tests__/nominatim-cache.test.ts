import { describe, it, expect, vi, afterEach } from 'vitest';
import { NominatimClient } from '../services/nominatim';
import { ResponseCache } from '../lib/response-cache';
import {
  NOMINATIM_CANDIDATES_CACHE_TTL_EMPTY,
  NOMINATIM_CANDIDATES_CACHE_TTL_OK,
} from '../lib/nominatim-cache';

describe('NominatimClient candidate cache', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not return a cached empty candidate list (refetches instead)', async () => {
    vi.spyOn(ResponseCache.prototype, 'get').mockResolvedValue(JSON.stringify([]));
    const putJson = vi.spyOn(ResponseCache.prototype, 'putJsonIfChanged').mockResolvedValue(true);
    const client = new NominatimClient(new ResponseCache(), 'LeaseUp-Test/1.0');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              lat: '40.018',
              lon: '-105.278',
              display_name: '1300 Pearl Street, Boulder, Colorado, United States',
              class: 'building',
              type: 'yes',
              address: {
                house_number: '1300',
                road: 'Pearl Street',
                city: 'Boulder',
                state: 'Colorado',
              },
            },
          ]),
          { status: 200 }
        )
      )
    );

    const candidates = await client.geocodeCandidates('1300 Pearl St, Boulder, CO 80302', 5);
    expect(candidates.length).toBe(1);
    expect(candidates[0]?.city).toBe('Boulder');
    expect(putJson).toHaveBeenCalled();
    expect(putJson.mock.calls.at(-1)?.[2]).toBe(NOMINATIM_CANDIDATES_CACHE_TTL_OK);
  });

  it('caches empty results for at most 60 seconds', async () => {
    vi.spyOn(ResponseCache.prototype, 'get').mockResolvedValue(null);
    const putJson = vi.spyOn(ResponseCache.prototype, 'putJsonIfChanged').mockResolvedValue(true);
    const client = new NominatimClient(new ResponseCache(), 'LeaseUp-Test/1.0');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));

    const candidates = await client.geocodeCandidates('nowhere on mars', 5);
    expect(candidates).toEqual([]);
    expect(putJson.mock.calls[0]?.[2]).toBe(NOMINATIM_CANDIDATES_CACHE_TTL_EMPTY);
  });

  it('falls back to legacy free-text search when structured search is empty', async () => {
    vi.spyOn(ResponseCache.prototype, 'get').mockResolvedValue(null);
    vi.spyOn(ResponseCache.prototype, 'putJsonIfChanged').mockResolvedValue(true);
    const client = new NominatimClient(new ResponseCache(), 'LeaseUp-Test/1.0');

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const u = String(input);
        if (u.includes('countrycodes=us')) {
          return new Response('[]', { status: 200 });
        }
        return new Response(
          JSON.stringify([
            {
              lat: '40.018',
              lon: '-105.278',
              display_name: '1300 Pearl Street, Boulder, Colorado, United States',
              class: 'building',
              type: 'yes',
              address: { house_number: '1300', road: 'Pearl Street', city: 'Boulder' },
            },
          ]),
          { status: 200 }
        );
      })
    );

    const candidates = await client.geocodeCandidates('1300 Pearl St, Boulder, CO 80302', 5);
    expect(candidates.length).toBe(1);
  });
});
