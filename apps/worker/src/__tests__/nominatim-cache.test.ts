import { describe, it, expect, vi, afterEach } from 'vitest';
import { NominatimClient } from '../services/nominatim';
import {
  NOMINATIM_CANDIDATES_CACHE_TTL_EMPTY,
  NOMINATIM_CANDIDATES_CACHE_TTL_OK,
} from '../lib/nominatim-cache';

describe('NominatimClient candidate cache', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not return a cached empty candidate list (refetches instead)', async () => {
    const put = vi.fn(async () => undefined);
    const cache = {
      get: vi.fn(async () => JSON.stringify([])),
      put,
    } as unknown as KVNamespace;
    const client = new NominatimClient(cache, 'LeaseUp-Test/1.0');

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
    expect(put).toHaveBeenCalled();
    const lastPut = put.mock.calls.at(-1) as [string, string, { expirationTtl: number }] | undefined;
    expect(lastPut?.[2]).toEqual({ expirationTtl: NOMINATIM_CANDIDATES_CACHE_TTL_OK });
  });

  it('caches empty results for at most 60 seconds', async () => {
    const put = vi.fn(async () => undefined);
    const cache = {
      get: vi.fn(async () => null),
      put,
    } as unknown as KVNamespace;
    const client = new NominatimClient(cache, 'LeaseUp-Test/1.0');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));

    const candidates = await client.geocodeCandidates('nowhere on mars', 5);
    expect(candidates).toEqual([]);
    expect(put).toHaveBeenCalled();
    const firstPut = put.mock.calls[0] as [string, string, { expirationTtl: number }] | undefined;
    const ttl = firstPut?.[2]?.expirationTtl;
    expect(ttl).toBe(NOMINATIM_CANDIDATES_CACHE_TTL_EMPTY);
  });

  it('falls back to legacy free-text search when structured search is empty', async () => {
    const put = vi.fn(async () => undefined);
    const cache = {
      get: vi.fn(async () => null),
      put,
    } as unknown as KVNamespace;
    const client = new NominatimClient(cache, 'LeaseUp-Test/1.0');

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
