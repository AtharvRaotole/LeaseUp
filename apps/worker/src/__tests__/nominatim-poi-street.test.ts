import { describe, it, expect, vi, afterEach } from 'vitest';
import { NominatimClient, nominatimResultHasStreetAddress } from '../services/nominatim';
import { ResponseCache } from '../lib/response-cache';

describe('nominatimResultHasStreetAddress', () => {
  it('is true when house_number and road are present on a POI', () => {
    expect(
      nominatimResultHasStreetAddress({
        lat: '40.017',
        lon: '-105.279',
        display_name: 'West Flanders Brewing Company, 1125, Pearl Street, Boulder, Colorado',
        class: 'amenity',
        type: 'restaurant',
        address: { house_number: '1125', road: 'Pearl Street', city: 'Boulder' },
      })
    ).toBe(true);
  });
});

describe('NominatimClient POI with street address', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps amenity/restaurant hits for 1125 Pearl St Boulder and labels from address only', async () => {
    vi.spyOn(ResponseCache.prototype, 'get').mockResolvedValue(null);
    vi.spyOn(ResponseCache.prototype, 'putJsonIfChanged').mockResolvedValue(true);
    const client = new NominatimClient(new ResponseCache(), 'LeaseUp-Test/1.0');

    const pearlRestaurant = {
      lat: '40.01748',
      lon: '-105.27935',
      display_name:
        'West Flanders Brewing Company, 1125, Pearl Street, Downtown Boulder, Boulder, Boulder County, Colorado, 80302, United States',
      class: 'amenity',
      type: 'restaurant',
      address: {
        house_number: '1125',
        road: 'Pearl Street',
        neighbourhood: 'Downtown Boulder',
        city: 'Boulder',
        state: 'Colorado',
      },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([pearlRestaurant]), { status: 200 }))
    );

    const candidates = await client.geocodeCandidates('1125 Pearl St, Boulder, CO 80302', 5);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.resolvedAddress).toBe('1125 Pearl Street, Downtown Boulder, Boulder');
    expect(candidates[0]?.resolvedAddress).not.toContain('Flanders');
    expect(candidates[0]?.resolvedAddress).not.toContain('Brewing');
  });

  it('still drops POI hits with no street address', async () => {
    vi.spyOn(ResponseCache.prototype, 'get').mockResolvedValue(null);
    vi.spyOn(ResponseCache.prototype, 'putJsonIfChanged').mockResolvedValue(true);
    const client = new NominatimClient(new ResponseCache(), 'LeaseUp-Test/1.0');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              lat: '40.0',
              lon: '-105.0',
              display_name: 'Some Shop, Boulder, Colorado',
              class: 'shop',
              type: 'gift',
              address: { city: 'Boulder' },
            },
          ]),
          { status: 200 }
        )
      )
    );

    const candidates = await client.legacyGeocodeCandidates('gift shop boulder', 5);
    expect(candidates).toHaveLength(0);
  });
});
