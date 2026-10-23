import type { GeocodeCandidate } from '@leaseup/contracts';
import { dedupeGeocodeCandidatesWithinMeters } from './geocode-label';

/** Prefer candidates whose city or borough appears in the user's input string. */
export function rankGeocodeCandidates(
  inputAddress: string,
  candidates: GeocodeCandidate[]
): GeocodeCandidate[] {
  const input = inputAddress.toLowerCase();
  const parts = input
    .split(/[,]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);

  const boroughs = /\b(brooklyn|queens|bronx|staten island|kings county|richmond county)\b/;
  const isNycWithoutBorough =
    /\b(new york,?\s*ny|nyc|new york city)\b/.test(input) && !boroughs.test(input);

  const score = (c: GeocodeCandidate): number => {
    let s = 0;
    const blob = `${c.resolvedAddress} ${c.city ?? ''} ${c.neighborhood ?? ''}`.toLowerCase();
    for (const part of parts) {
      if (blob.includes(part)) s += 15;
    }
    if (c.city && input.includes(c.city.toLowerCase())) s += 25;
    if (c.neighborhood && input.includes(c.neighborhood.toLowerCase())) s += 20;
    // "New York, NY" with no borough named means Manhattan (New York County) by USPS convention.
    if (isNycWithoutBorough && /\b(manhattan|new york county)\b/.test(blob)) s += 30;
    return s;
  };

  // Nominatim often returns the same address twice (building + entrance nodes); dedupe so
  // an unambiguous address does not land in "Needs confirmation".
  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    const k = c.resolvedAddress.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const spaced = dedupeGeocodeCandidatesWithinMeters(unique, 50);
  return spaced.sort((a, b) => score(b) - score(a));
}
