import type { GeocodeCandidate } from '@leaseup/contracts';

function looksLikeStreetSegment(segment: string): boolean {
  return (
    /\d/.test(segment) ||
    /\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|place|pl)\b/i.test(segment)
  );
}

function streetLineFromResolvedLabel(resolvedAddress: string): string {
  const segments = resolvedAddress.split(',').map((s) => s.trim()).filter(Boolean);
  if (
    segments.length >= 3 &&
    !looksLikeStreetSegment(segments[0]!) &&
    /^\d+[A-Za-z]?(-\d+)?$/.test(segments[1]!)
  ) {
    return `${segments[1]} ${segments[2]}`.replace(/\s+/g, ' ').trim();
  }
  if (segments.length >= 2 && /^\d+[A-Za-z]?(-\d+)?$/.test(segments[0]!)) {
    return `${segments[0]} ${segments[1]}`.replace(/\s+/g, ' ').trim();
  }
  return segments[0] ?? resolvedAddress;
}

export function postalCodeFromResolved(resolvedAddress: string): string | null {
  const match = resolvedAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1] ?? null;
}

export function geocodeCandidateTitle(c: GeocodeCandidate): string {
  return c.neighborhood ?? c.city ?? 'This location';
}

export function geocodeCandidateSubtitle(c: GeocodeCandidate): string {
  const city = c.city ?? '';
  const zip = postalCodeFromResolved(c.resolvedAddress);
  if (city && zip) return `${city}, ${zip}`;
  if (city) return city;
  return c.resolvedAddress;
}

/** First segment of Nominatim label (street number and name). */
export function geocodeCandidateStreetLine(c: GeocodeCandidate): string {
  return streetLineFromResolvedLabel(c.resolvedAddress);
}

/** Stable key for merging picker rows that differ only in Nominatim punctuation. */
export function geocodeCandidateDedupeKey(c: GeocodeCandidate): string {
  const street = geocodeCandidateStreetLine(c).toLowerCase().replace(/\s+/g, ' ').trim();
  const place = geocodeCandidateTitle(c).toLowerCase().replace(/\s+/g, ' ').trim();
  return `${street}|${place}`;
}

function haversineKm(a: GeocodeCandidate, b: GeocodeCandidate): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceFromFirstLabel(
  first: GeocodeCandidate,
  other: GeocodeCandidate
): string | null {
  const km = haversineKm(first, other);
  if (km < 0.15) return null;
  const miles = km * 0.621371;
  if (miles < 0.3) return 'About 0.2 mi from the first match';
  return `About ${miles.toFixed(1)} mi from the first match`;
}
