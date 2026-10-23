import type { GeocodeCandidate, Location } from '@leaseup/contracts';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
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
    quarter?: string;
    city_district?: string;
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
    const candidates = await this.geocodeCandidates(address, 1);
    if (candidates.length === 0) {
      throw new Error('Address not found');
    }
    const top = candidates[0]!;
    return {
      address,
      latitude: top.latitude,
      longitude: top.longitude,
      city: top.city,
      neighborhood: top.neighborhood,
      resolvedAddress: top.resolvedAddress,
    };
  }

  async geocodeCandidates(address: string, limit = 5): Promise<GeocodeCandidate[]> {
    const cacheKey = `nominatim:candidates:${address.toLowerCase().trim()}:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as GeocodeCandidate[];
    }

    await this.enforceRateLimit();

    const query = encodeURIComponent(address);
    const url =
      `${NOMINATIM_BASE}?q=${query}&format=json&limit=${limit}` +
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
    const candidates = results.map((result) => this.toCandidate(address, result));

    await this.cache.put(cacheKey, JSON.stringify(candidates), { expirationTtl: 86400 });

    return candidates;
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const cacheKey = `nominatim:reverse:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    await this.enforceRateLimit();

    const url =
      `${NOMINATIM_REVERSE}?lat=${latitude}&lon=${longitude}&format=json` +
      '&addressdetails=1&zoom=14';

    const response = await fetch(url, {
      headers: {
        'User-Agent': this.contact,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }

    const result = (await response.json()) as NominatimResult;
    const label =
      result.address?.neighbourhood ||
      result.address?.suburb ||
      result.address?.quarter ||
      result.address?.city_district ||
      result.address?.city ||
      result.address?.town ||
      result.display_name?.split(',')[0] ||
      'Area';

    await this.cache.put(cacheKey, label, { expirationTtl: 86400 * 7 });
    return label;
  }

  private toCandidate(inputAddress: string, result: NominatimResult): GeocodeCandidate {
    const city =
      result.address?.city ||
      result.address?.town ||
      result.address?.village ||
      result.address?.county;

    return {
      address: inputAddress,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city,
      neighborhood:
        result.address?.neighbourhood ||
        result.address?.suburb ||
        result.address?.quarter ||
        result.address?.city_district,
      resolvedAddress: result.display_name,
    };
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
