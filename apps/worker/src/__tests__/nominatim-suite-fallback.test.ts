import { describe, it, expect, vi, afterEach } from 'vitest';
import { NominatimClient } from '../services/nominatim';
import { ResponseCache } from '../lib/response-cache';

describe('NominatimClient suite fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries structured search without suite when suite query returns empty', async () => {
    vi.stubGlobal('caches', {
      default: {
        match: async () => undefined,
        put: async () => undefined,
      },
    });
    const client = new NominatimClient(new ResponseCache(), 'LeaseUp-Test/1.0');

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const u = String(input);
        if (u.includes('street=5085+Westheimer+Rd+Ste')) {
          return new Response('[]', { status: 200 });
        }
        if (u.includes('street=5085+Westheimer+Rd&') && !u.includes('Ste')) {
          return new Response(
            JSON.stringify([
              {
                lat: '29.7419',
                lon: '-95.4636',
                display_name:
                  '5085, Westheimer Road, Houston, Harris County, Texas, 77056, United States',
                class: 'building',
                type: 'yes',
                address: {
                  house_number: '5085',
                  road: 'Westheimer Road',
                  city: 'Houston',
                  state: 'Texas',
                },
              },
            ]),
            { status: 200 }
          );
        }
        return new Response('[]', { status: 200 });
      })
    );

    const candidates = await client.geocodeCandidates(
      '5085 Westheimer Rd Ste 2500, Houston, TX 77056',
      5
    );
    expect(candidates.length).toBe(1);
    expect(candidates[0]?.resolvedAddress).toContain('Westheimer');
  });
});
