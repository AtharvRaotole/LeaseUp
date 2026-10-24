import type { GeocodePreviewResponse } from '@leaseup/contracts';
import { matchDemoFixtureId, wickerparkFixture } from '@leaseup/fixtures';

/** Recorded ambiguous geocode for 350 Bleecker (offline demo, no Nominatim). */
function bleeckerDemoPreview(address: string): GeocodePreviewResponse | null {
  const norm = address.trim().toLowerCase();
  if (!norm.includes('350') || !norm.includes('bleecker')) return null;
  const lat = 40.73352;
  const lng = -74.00271;
  return {
    needsConfirmation: true,
    candidates: [
      {
        address,
        latitude: lat,
        longitude: lng,
        neighborhood: 'West Village',
        city: 'New York',
        resolvedAddress:
          '350 Bleecker Street, West Village, Manhattan, New York, NY 10014, United States',
      },
      {
        address,
        latitude: 40.70485,
        longitude: -73.9052,
        neighborhood: 'Ridgewood',
        city: 'Brooklyn',
        resolvedAddress:
          '350 Bleecker Street, Ridgewood, Brooklyn, Kings County, New York, 11237, United States',
      },
    ],
  };
}

/** Demo-only geocode confirm for partial Wicker Park typing (no live Nominatim). */
export function demoGeocodePreviewForAddress(address: string): GeocodePreviewResponse | null {
  const bleecker = bleeckerDemoPreview(address);
  if (bleecker) return bleecker;

  if (matchDemoFixtureId(address)) return null;

  const norm = address.trim().toLowerCase();
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
