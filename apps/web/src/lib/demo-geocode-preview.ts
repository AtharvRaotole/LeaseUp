import type { GeocodePreviewResponse } from '@leaseup/contracts';
import { DEMO_CHIP_ADDRESSES, wickerparkFixture } from '@leaseup/fixtures';

/** Demo-only geocode confirm for partial Wicker Park typing (no live Nominatim). */
export function demoGeocodePreviewForAddress(address: string): GeocodePreviewResponse | null {
  const norm = address.trim().toLowerCase();
  if (norm === DEMO_CHIP_ADDRESSES.wicker.trim().toLowerCase()) return null;
  const isWickerPartial =
    norm.includes('1574') && norm.includes('milwaukee') && norm.includes('chicago');
  if (!isWickerPartial) return null;

  const lat = wickerparkFixture.location.latitude;
  const lng = wickerparkFixture.location.longitude;
  return {
    needsConfirmation: true,
    candidates: [
      {
        address,
        latitude: lat,
        longitude: lng,
        neighborhood: 'Wicker Park',
        city: 'Chicago',
        resolvedAddress: DEMO_CHIP_ADDRESSES.wicker,
      },
      {
        address,
        latitude: lat + 0.0075,
        longitude: lng - 0.0055,
        neighborhood: 'Bucktown',
        city: 'Chicago',
        resolvedAddress: '1600 N Milwaukee Ave, Chicago, IL 60622',
      },
    ],
  };
}
