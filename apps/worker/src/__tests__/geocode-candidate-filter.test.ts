import { describe, it, expect } from 'vitest';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import {
  dedupeGeocodeCandidatesByPlaceAndDistance,
  filterCandidatesByInputPostalCode,
} from '../lib/geocode-candidate-filter';
import { resolveGeocodeFromCandidates } from '../lib/geocode-resolve';

describe('filterCandidatesByInputPostalCode', () => {
  it('drops candidates whose ZIP does not match the typed ZIP', () => {
    const input = '350 Bleecker St, New York, NY 10014';
    const kept = filterCandidatesByInputPostalCode(input, [
      {
        address: input,
        latitude: 40.734,
        longitude: -74.003,
        city: 'New York',
        neighborhood: 'West Village',
        resolvedAddress:
          '350 Bleecker Street, West Village, Manhattan, New York County, New York, 10014, United States',
      },
      {
        address: input,
        latitude: 40.7,
        longitude: -73.92,
        city: 'New York',
        neighborhood: 'Ridgewood',
        resolvedAddress:
          '350 Bleecker Street, Ridgewood, Brooklyn, Kings County, New York, 11237, United States',
      },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.neighborhood).toBe('West Village');
  });

  it('keeps candidates with no ZIP in the label when the input has a ZIP', () => {
    const input = DEMO_CHIP_ADDRESSES.wicker;
    const kept = filterCandidatesByInputPostalCode(input, [
      {
        address: input,
        latitude: 41.9088,
        longitude: -87.6776,
        city: 'Chicago',
        neighborhood: 'Wicker Park',
        resolvedAddress: 'Wicker Park, Chicago, IL',
      },
    ]);
    expect(kept).toHaveLength(1);
  });
});

const DEMO_CHIP_ADDRESSES = {
  wicker: '1574 N Milwaukee Ave, Chicago, IL 60622',
};

describe('dedupeGeocodeCandidatesByPlaceAndDistance', () => {
  it('merges two West Village rows within 50 m when city and state match', () => {
    const input = '350 Bleecker St, New York, NY 10014';
    const a = {
      address: input,
      latitude: 40.73352,
      longitude: -74.00271,
      city: 'New York',
      neighborhood: 'West Village',
      resolvedAddress: '350 Bleecker Street, West Village, Manhattan, New York, 10014, United States',
    };
    const b = {
      ...a,
      latitude: 40.73355,
      longitude: -74.00275,
      resolvedAddress:
        '350, Bleecker Street, West Village, Manhattan, New York County, New York, 10014, United States',
    };
    expect(dedupeGeocodeCandidatesByPlaceAndDistance([a, b], 50)).toHaveLength(1);
  });
});

describe('resolveGeocodeFromCandidates with ZIP filter and dedupe', () => {
  it('skips the picker when only one candidate remains for Bleecker with ZIP', () => {
    const input = '350 Bleecker St, New York, NY 10014';
    const preview = resolveGeocodeFromCandidates(input, [
      {
        address: input,
        latitude: 40.73352,
        longitude: -74.00271,
        city: 'New York',
        neighborhood: 'West Village',
        resolvedAddress: '350 Bleecker Street, West Village, Manhattan, New York, 10014, United States',
      },
      {
        address: input,
        latitude: 40.73355,
        longitude: -74.00275,
        city: 'New York',
        neighborhood: 'West Village',
        resolvedAddress:
          '350, Bleecker Street, West Village, Manhattan, New York County, New York, 10014, United States',
      },
      {
        address: input,
        latitude: 40.7,
        longitude: -73.92,
        city: 'New York',
        neighborhood: 'Ridgewood',
        resolvedAddress:
          '350 Bleecker Street, Ridgewood, Brooklyn, Kings County, New York, 11237, United States',
      },
    ]);
    expect(preview.needsConfirmation).toBe(false);
    expect(preview.location?.neighborhood).toBe('West Village');
  });
});
