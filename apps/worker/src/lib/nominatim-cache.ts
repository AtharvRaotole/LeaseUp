/** Positive geocode candidate lists (24h). Empty/error lists use a short TTL only. */
export const NOMINATIM_CANDIDATES_CACHE_TTL_OK = 86_400;
export const NOMINATIM_CANDIDATES_CACHE_TTL_EMPTY = 60;

export const NOMINATIM_CANDIDATES_CACHE_VERSION = 'v5';

export function nominatimCandidatesCacheKey(address: string, limit: number): string {
  return `nominatim:candidates:${NOMINATIM_CANDIDATES_CACHE_VERSION}:${address.toLowerCase().trim()}:${limit}`;
}
