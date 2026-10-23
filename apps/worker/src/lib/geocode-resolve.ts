import type { GeocodeCandidate, Location } from '@leaseup/contracts';
import { geocodeCandidateScore, rankGeocodeCandidates } from './geocode-rank';

/** If the top candidate beats the runner-up by at least this much, we auto-pick it. */
export const GEOCODE_SCORE_MARGIN = 12;

export type GeocodePreview = {
  needsConfirmation: boolean;
  candidates: GeocodeCandidate[];
  location?: Location;
};

export function candidateToLocation(inputAddress: string, c: GeocodeCandidate, neighborhood?: string): Location {
  return {
    address: inputAddress,
    latitude: c.latitude,
    longitude: c.longitude,
    city: c.city,
    neighborhood: neighborhood ?? c.neighborhood,
    resolvedAddress: c.resolvedAddress,
  };
}

export function resolveGeocodeFromCandidates(
  inputAddress: string,
  raw: GeocodeCandidate[]
): GeocodePreview {
  const ranked = rankGeocodeCandidates(inputAddress, raw);
  const candidates = ranked.slice(0, 3);

  if (candidates.length === 0) {
    throw new Error('Address not found');
  }

  if (candidates.length === 1) {
    const only = candidates[0]!;
    return {
      needsConfirmation: false,
      candidates,
      location: candidateToLocation(inputAddress, only),
    };
  }

  const scores = candidates.map((c) => geocodeCandidateScore(inputAddress, c));
  const needsConfirmation = scores[0]! - scores[1]! < GEOCODE_SCORE_MARGIN;

  if (!needsConfirmation) {
    const top = candidates[0]!;
    return {
      needsConfirmation: false,
      candidates,
      location: candidateToLocation(inputAddress, top),
    };
  }

  return { needsConfirmation: true, candidates };
}
