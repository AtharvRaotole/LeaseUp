import type { Location } from '@leaseup/contracts';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL_MS = 1000;

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    county?: string;
    state?: string;
  };
};

export class NominatimClient {
  private cache: KVNamespace;
  private contact: string;
  private lastRequestAt = 0;

  constructor(cache: KVNamespace, contact: string) {
    this.cache = cache;
    this.contact = contact;
  }

  async geocode(address: string): Promise<Location> {
    const cacheKey = `nominatim:${address.toLowerCase().trim()}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Location;
    }

    await this.enforceRateLimit();

    const query = encodeURIComponent(address);
    const url =
      `${NOMINATIM_BASE}?q=${query}&format=json&limit=1` +
      '&addressdetails=1&countrycodes=us';

    const response = await fetch(url, {
      headers: {
        'User-Agent': this.contact,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to geocode address (${response.status})`);
    }

    const results = (await response.json()) as NominatimResult[];
    if (results.length === 0) {
      throw new Error('Address not found');
    }

    const result = results[0]!;
    const city =
      result.address?.city ||
      result.address?.town ||
      result.address?.village ||
      result.address?.county;

    const location: Location = {
      address,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city,
      neighborhood: result.address?.neighbourhood || result.address?.suburb,
      resolvedAddress: result.display_name,
    };

    await this.cache.put(cacheKey, JSON.stringify(location), { expirationTtl: 86400 });

    return location;
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const waitMs = MIN_INTERVAL_MS - (now - this.lastRequestAt);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.lastRequestAt = Date.now();
  }
}
