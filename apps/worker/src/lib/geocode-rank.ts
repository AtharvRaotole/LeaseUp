import type { GeocodeCandidate } from '@leaseup/contracts';
import {
  dedupeGeocodeCandidatesByPlaceAndDistance,
  filterCandidatesByInputPostalCode,
} from './geocode-candidate-filter';

/** Prefer candidates whose city or borough appears in the user's input string. */
export function geocodeCandidateScore(inputAddress: string, c: GeocodeCandidate): number {
  const input = inputAddress.toLowerCase();
  const parts = input
    .split(/[,]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);

  const boroughs = /\b(brooklyn|queens|bronx|staten island|kings county|richmond county)\b/;
  const isNycWithoutBorough =
    /\b(new york,?\s*ny|nyc|new york city)\b/.test(input) && !boroughs.test(input);

  let s = 0;
  const resolvedBlob = c.resolvedAddress.toLowerCase();
  for (const part of parts) {
    if (resolvedBlob.includes(part)) s += 15;
  }
  if (c.city && input.includes(c.city.toLowerCase()) && resolvedBlob.includes(c.city.toLowerCase())) s += 25;
  if (
    c.neighborhood &&
    input.includes(c.neighborhood.toLowerCase()) &&
    resolvedBlob.includes(c.neighborhood.toLowerCase())
  ) {
    s += 20;
  }
  // "New York, NY" with no borough named means Manhattan (New York County) by USPS convention.
  if (isNycWithoutBorough && /\b(manhattan|new york county)\b/.test(resolvedBlob)) s += 30;

  if (/\bboulder\b/.test(input) && /\bboulder\b/.test(resolvedBlob)) s += 35;
  if (/\bboulder\b/.test(input) && /\bdenver\b/.test(resolvedBlob)) s -= 25;

  if (/\bchicago\b/.test(input)) {
    if (/\bchicago\b/.test(resolvedBlob) || /\bcook county\b/.test(resolvedBlob)) s += 35;
    else if (/\billinois\b/.test(resolvedBlob)) s += 20;
    else s -= 45;
  }
  if (/\bboulder\b/.test(input) && /\bcolorado\b/.test(resolvedBlob) && /\bboulder\b/.test(resolvedBlob)) {
    s += 15;
  }

  return s;
}

export function rankGeocodeCandidates(
  inputAddress: string,
  candidates: GeocodeCandidate[]
): GeocodeCandidate[] {
  const score = (c: GeocodeCandidate): number => geocodeCandidateScore(inputAddress, c);

  let list = filterCandidatesByInputPostalCode(inputAddress, candidates);

  const seen = new Set<string>();
  list = list.filter((c) => {
    const k = c.resolvedAddress.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  list = dedupeGeocodeCandidatesByPlaceAndDistance(list, 50);
  return list.sort((a, b) => score(b) - score(a));
}
