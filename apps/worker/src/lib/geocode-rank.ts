import type { GeocodeCandidate } from '@leaseup/contracts';

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

  const score = (c: GeocodeCandidate): number => {
    let s = 0;
    const blob = `${c.resolvedAddress} ${c.city ?? ''} ${c.neighborhood ?? ''}`.toLowerCase();
    for (const part of parts) {
      if (blob.includes(part)) s += 15;
    }
    if (c.city && input.includes(c.city.toLowerCase())) s += 25;
    if (c.neighborhood && input.includes(c.neighborhood.toLowerCase())) s += 20;
    return s;
  };

  return [...candidates].sort((a, b) => score(b) - score(a));
}
