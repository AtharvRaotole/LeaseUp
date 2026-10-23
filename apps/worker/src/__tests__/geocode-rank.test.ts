import { describe, it, expect } from 'vitest';
import { rankGeocodeCandidates } from '../lib/geocode-rank';

describe('rankGeocodeCandidates', () => {
  it('prefers Manhattan when the input names Manhattan', () => {
    const ranked = rankGeocodeCandidates('350 Bleecker St, Manhattan, NY', [
      {
        address: '350 Bleecker St, Manhattan, NY',
        latitude: 40.7335,
        longitude: -74.0027,
        resolvedAddress: '350, Bleecker Street, Manhattan, New York County, New York, 10014, USA',
        city: 'New York',
        neighborhood: 'Manhattan',
      },
      {
        address: '350 Bleecker St, Manhattan, NY',
        latitude: 40.7,
        longitude: -74.0,
        resolvedAddress: '350 Bleecker Street, Ridgewood, Queens, NY',
        city: 'New York',
        neighborhood: 'Ridgewood',
      },
    ]);
    expect(ranked[0]?.neighborhood).toBe('Manhattan');
  });
});
