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

  it('prefers Manhattan for "New York, NY" with no borough (real Nominatim order puts Brooklyn first)', () => {
    const base = { address: '350 Bleecker St, New York, NY', city: 'New York' };
    const ranked = rankGeocodeCandidates('350 Bleecker St, New York, NY', [
      { ...base, latitude: 40.70, longitude: -73.92, neighborhood: 'Ridgewood',
        resolvedAddress: '350, Bleecker Street, Ridgewood, Bushwick, Brooklyn, Kings County, New York, 11237, United States' },
      { ...base, latitude: 40.734, longitude: -74.003, neighborhood: 'West Village',
        resolvedAddress: '350, Bleecker Street, West Village, Manhattan, New York County, New York, 10014, United States' },
    ]);
    expect(ranked[0]?.neighborhood).toBe('West Village');
  });

  it('keeps Brooklyn when the input names Brooklyn', () => {
    const base = { address: '350 Bleecker St, Brooklyn, NY', city: 'New York' };
    const ranked = rankGeocodeCandidates('350 Bleecker St, Brooklyn, NY', [
      { ...base, latitude: 40.734, longitude: -74.003, neighborhood: 'West Village',
        resolvedAddress: '350, Bleecker Street, West Village, Manhattan, New York County, New York, 10014, United States' },
      { ...base, latitude: 40.70, longitude: -73.92, neighborhood: 'Ridgewood',
        resolvedAddress: '350, Bleecker Street, Ridgewood, Bushwick, Brooklyn, Kings County, New York, 11237, United States' },
    ]);
    expect(ranked[0]?.neighborhood).toBe('Ridgewood');
  });
});

describe('rankGeocodeCandidates dedupe', () => {
  it('collapses identical resolved addresses', () => {
    const c = { address: 'a', latitude: 41.9, longitude: -87.68, city: 'Chicago', neighborhood: 'West Town',
      resolvedAddress: '1574, North Milwaukee Avenue, Wicker Park, West Town, Chicago, Illinois, 60622, United States' };
    expect(rankGeocodeCandidates('1574 N Milwaukee Ave, Chicago, IL 60622', [c, { ...c, latitude: 41.9001 }])).toHaveLength(1);
  });
});
