import type { GeocodeCandidate } from '@leaseup/contracts';

export function postalCodeFromResolved(resolvedAddress: string): string | null {
  const match = resolvedAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
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

/** Web mercator tile index for a static map thumbnail (Carto basemap). */
export function mapThumbnailUrl(lat: number, lng: number, zoom = 14): string {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return `https://basemaps.cartocdn.com/light_all/${zoom}/${x}/${y}.png`;
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
