import type { GeocodeCandidate, Location } from '@leaseup/contracts';
import type { ResponseCache } from '../lib/response-cache';
import {
  formatGeocodeCandidateLabel,
  formatPoiAddressLabel,
  isPoiClass,
  isPoiOnlyResult,
} from '../lib/geocode-label';
import { rankGeocodeCandidates } from '../lib/geocode-rank';
import { UpstreamError } from '../lib/errors';
import { NOMINATIM_CANDIDATES_CACHE_TTL_OK, nominatimCandidatesCacheKey } from '../lib/nominatim-cache';
import { parseUsAddress, streetForGeocodeSearch } from '../lib/parse-us-address';
import { candidateToLocation, resolveGeocodeFromCandidates } from '../lib/geocode-resolve';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const MIN_INTERVAL_MS = 1000;
export const NOMINATIM_FETCH_TIMEOUT_MS = 12_000;

export const GEOCODE_TIMEOUT_USER_MESSAGE =
  'Address lookup timed out. Check the spelling and try again in a moment.';

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
  private cache: ResponseCache;
  private contact: string;
  private lastRequestAt = 0;

  constructor(cache: ResponseCache, contact: string) {
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
    const cacheKey = nominatimCandidatesCacheKey(address, limit);
    const cached = await this.cache.get(cacheKey, 'text');
    if (typeof cached === 'string') {
      try {
        const parsed = JSON.parse(cached) as GeocodeCandidate[];
        if (parsed.length > 0) return parsed;
      } catch {
        /* treat corrupt cache as miss */
      }
      // Never serve a cached empty list for the full 24h window — refetch.
    }

    let candidates = await this.collectCandidates(address, limit);
    if (candidates.length === 0) {
      candidates = await this.legacyGeocodeCandidates(address, limit);
    }

    const ranked = rankGeocodeCandidates(address, candidates).slice(0, limit);
    await this.writeCandidatesCache(cacheKey, ranked);
    return ranked;
  }

  /** Legacy single-query free-text search (pre-structured pipeline), used when structured search is empty. */
  async legacyGeocodeCandidates(address: string, limit = 5): Promise<GeocodeCandidate[]> {
    await this.enforceRateLimit();
    const results = await this.fetchSearchSafe({
      q: address.trim(),
      format: 'json',
      limit: String(limit),
      addressdetails: '1',
    });
    return this.resultsToCandidates(address, results, limit);
  }

  private async collectCandidates(address: string, limit: number): Promise<GeocodeCandidate[]> {
    const parsed = parseUsAddress(address);
    const merged: NominatimResult[] = [];

    if (parsed.street) {
      await this.enforceRateLimit();
      merged.push(...(await this.fetchSearchSafe(this.buildStructuredParams(parsed, limit))));

      const simplifiedStreet = streetForGeocodeSearch(parsed.street);
      if (merged.length === 0 && simplifiedStreet && simplifiedStreet !== parsed.street) {
        await this.enforceRateLimit();
        merged.push(
          ...(await this.fetchSearchSafe(
            this.buildStructuredParams({ ...parsed, street: simplifiedStreet }, limit)
          ))
        );
      }
    }

    const freeTextQuery =
      parsed.street && streetForGeocodeSearch(parsed.street) !== parsed.street
        ? address.replace(parsed.street, streetForGeocodeSearch(parsed.street))
        : address;

    await this.enforceRateLimit();
    merged.push(
      ...(await this.fetchSearchSafe({
        q: freeTextQuery,
        format: 'json',
        limit: String(limit),
        addressdetails: '1',
        countrycodes: 'us',
      }))
    );

    if (merged.length === 0 && freeTextQuery !== address) {
      await this.enforceRateLimit();
      merged.push(
        ...(await this.fetchSearchSafe({
          q: address,
          format: 'json',
          limit: String(limit),
          addressdetails: '1',
          countrycodes: 'us',
        }))
      );
    }

    return this.resultsToCandidates(address, merged, limit);
  }

  private resultsToCandidates(
    inputAddress: string,
    merged: NominatimResult[],
    limit: number
  ): GeocodeCandidate[] {
    const seen = new Set<string>();
    const candidates: GeocodeCandidate[] = [];
    for (const result of merged) {
      const key = `${Number(result.lat).toFixed(5)},${Number(result.lon).toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(this.toCandidate(inputAddress, result));
      if (candidates.length >= limit) break;
    }
    return candidates;
  }

  private async writeCandidatesCache(cacheKey: string, deduped: GeocodeCandidate[]): Promise<void> {
    if (deduped.length === 0) return;
    await this.cache.putJsonIfChanged(cacheKey, deduped, NOMINATIM_CANDIDATES_CACHE_TTL_OK);
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

  private isGeocodeTimeoutError(err: unknown): boolean {
    return (
      err instanceof UpstreamError &&
      (err.code === 'GEOCODE_TIMEOUT' || err.code === 'GEOCODE_UPSTREAM_ERROR')
    );
  }

  private async fetchSearchSafe(params: Record<string, string>): Promise<NominatimResult[]> {
    try {
      return await this.fetchSearch(params);
    } catch (err) {
      if (this.isGeocodeTimeoutError(err)) throw err;
      return [];
    }
  }

  private async fetchSearch(params: Record<string, string>): Promise<NominatimResult[]> {
    const url = `${NOMINATIM_BASE}?${new URLSearchParams(params).toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NOMINATIM_FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': this.contact,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        const timeoutErr = new UpstreamError('Nominatim geocode timed out', 503);
        timeoutErr.code = 'GEOCODE_TIMEOUT';
        timeoutErr.userMessage = GEOCODE_TIMEOUT_USER_MESSAGE;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const err = new UpstreamError(`Nominatim geocode failed (${response.status})`, response.status);
      err.code = 'GEOCODE_UPSTREAM_ERROR';
      err.userMessage = 'Address lookup is slow right now. Try again in a moment.';
      throw err;
    }

    const results = (await response.json()) as NominatimResult[];
    return results.filter((r) => !isPoiOnlyResult(r));
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const cacheKey = `nominatim:reverse:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const cached = await this.cache.get(cacheKey, 'text');
    if (typeof cached === 'string') return cached;

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

    await this.cache.putTextIfChanged(cacheKey, label, 86400 * 7);
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
      resolvedAddress:
        isPoiClass(result.class) && result.address
          ? formatPoiAddressLabel(result.address)
          : formatGeocodeCandidateLabel(result.display_name, result.address),
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

