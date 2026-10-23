import type { GeocodeCandidate, Location } from '@leaseup/contracts';
import {
  dedupeGeocodeCandidatesWithinMeters,
  formatGeocodeCandidateLabel,
} from '../lib/geocode-label';
import { parseUsAddress } from '../lib/parse-us-address';
import { candidateToLocation, resolveGeocodeFromCandidates } from '../lib/geocode-resolve';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const MIN_INTERVAL_MS = 1000;

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city_district?: string;
    borough?: string;
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
    const preview = resolveGeocodeFromCandidates(
      address,
      await this.geocodeCandidates(address, 5)
    );
    if (preview.needsConfirmation || !preview.location) {
      const top = preview.candidates[0]!;
      return candidateToLocation(address, top);
    }
    return preview.location;
  }

  async geocodeCandidates(address: string, limit = 5): Promise<GeocodeCandidate[]> {
    const cacheKey = `nominatim:candidates:v3:${address.toLowerCase().trim()}:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as GeocodeCandidate[];
    }

    const parsed = parseUsAddress(address);
    const merged: NominatimResult[] = [];

    if (parsed.street) {
      await this.enforceRateLimit();
      const structured = await this.fetchSearch(this.buildStructuredParams(parsed, limit));
      merged.push(...structured);
    }

    await this.enforceRateLimit();
    const freeText = await this.fetchSearch({
      q: address,
      format: 'json',
      limit: String(limit),
      addressdetails: '1',
      countrycodes: 'us',
    });
    merged.push(...freeText);

    const seen = new Set<string>();
    const candidates: GeocodeCandidate[] = [];
    for (const result of merged) {
      const key = `${Number(result.lat).toFixed(5)},${Number(result.lon).toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(this.toCandidate(address, result));
      if (candidates.length >= limit) break;
    }

    const deduped = dedupeGeocodeCandidatesWithinMeters(candidates, 50);

    await this.cache.put(cacheKey, JSON.stringify(deduped), { expirationTtl: 86400 });

    return deduped;
  }

  private buildStructuredParams(parsed: ReturnType<typeof parseUsAddress>, limit: number): Record<string, string> {
    const params: Record<string, string> = {
      format: 'json',
      limit: String(limit),
      addressdetails: '1',
      countrycodes: 'us',
    };
    if (parsed.street) params.street = parsed.street;
    if (parsed.city) params.city = parsed.city;
    if (parsed.state) params.state = parsed.state;
    if (parsed.postalCode) params.postalcode = parsed.postalCode;
    return params;
  }

  private async fetchSearch(params: Record<string, string>): Promise<NominatimResult[]> {
    const url = `${NOMINATIM_BASE}?${new URLSearchParams(params).toString()}`;
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
    return results.filter((r) => !isPoiOnlyResult(r));
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
        result.address?.city_district ||
        result.address?.borough,
      resolvedAddress: formatGeocodeCandidateLabel(result.display_name, result.address),
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

function isPoiOnlyResult(result: NominatimResult): boolean {
  const cls = result.class?.toLowerCase();
  const typ = result.type?.toLowerCase();
  if (!cls) return false;
  if (cls === 'shop' || cls === 'amenity' || cls === 'tourism') return true;
  if (typ === 'house' || typ === 'building' || typ === 'address' || typ === 'residential') {
    return false;
  }
  if (cls === 'building' || cls === 'place') return false;
  return cls === 'poi';
}
