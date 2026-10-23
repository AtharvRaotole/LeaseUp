import { describe, it, expect } from 'vitest';
import { resolveGeocodeFromCandidates } from '../lib/geocode-resolve';

describe('resolveGeocodeFromCandidates', () => {
  it('auto-resolves 350 Bleecker with ZIP after Ridgewood drop and West Village dedupe', () => {
    const input = '350 Bleecker St, New York, NY 10014';
    const preview = resolveGeocodeFromCandidates(input, [
      {
        address: input,
        latitude: 40.73352,
        longitude: -74.00271,
        city: 'New York',
        neighborhood: 'West Village',
        resolvedAddress:
          '350 Bleecker Street, West Village, Manhattan, New York, New York, 10014, United States',
      },
      {
        address: input,
        latitude: 40.73355,
        longitude: -74.00275,
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
    expect(preview.candidates).toHaveLength(1);
  });

  it('auto-picks a clear Manhattan winner for Bleecker St NYC', () => {
    const preview = resolveGeocodeFromCandidates('350 Bleecker St, New York, NY', [
      {
        address: '350 Bleecker St, New York, NY',
        latitude: 40.7,
        longitude: -73.92,
        resolvedAddress: '350 Bleecker Street, Ridgewood, Brooklyn, NY',
        city: 'New York',
        neighborhood: 'Ridgewood',
      },
      {
        address: '350 Bleecker St, New York, NY',
        latitude: 40.734,
        longitude: -74.003,
        resolvedAddress: '350, Bleecker Street, West Village, Manhattan, New York County, New York, 10014, United States',
        city: 'New York',
        neighborhood: 'West Village',
      },
    ]);
    expect(preview.needsConfirmation).toBe(false);
    expect(preview.location?.neighborhood).toBe('West Village');
  });

  it('asks for confirmation when top scores are close', () => {
    const preview = resolveGeocodeFromCandidates('100 Main St, Springfield, IL', [
      {
        address: '100 Main St, Springfield, IL',
        latitude: 39.8,
        longitude: -89.65,
        resolvedAddress: '100 Main St, Springfield, Illinois',
        city: 'Springfield',
      },
      {
        address: '100 Main St, Springfield, IL',
        latitude: 39.81,
        longitude: -89.64,
        resolvedAddress: '100 Main Street, Springfield, Sangamon County, Illinois',
        city: 'Springfield',
      },
    ]);
    expect(preview.needsConfirmation).toBe(true);
    expect(preview.candidates.length).toBeLessThanOrEqual(3);
  });
});
