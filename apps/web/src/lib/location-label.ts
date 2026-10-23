import type { Location } from '@leaseup/contracts';

/** Short place label for headlines (neighborhood + city, not street). */
export function placeHeadlineLabel(location: Location): string {
  if (location.neighborhood && location.city) {
    return `${location.neighborhood}, ${location.city}`;
  }
  if (location.resolvedAddress && !location.resolvedAddress.includes(',')) {
    return location.resolvedAddress;
  }
  if (location.city) return location.city;
  const parts = location.address.split(',').map((p) => p.trim());
  if (parts.length >= 2) return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  return location.address;
}

/** Bold neighborhood for sticky header. */
export function placeNeighborhoodBold(location: Location): string {
  return location.neighborhood || location.city || 'Location';
}
