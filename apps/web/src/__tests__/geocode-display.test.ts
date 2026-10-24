import { describe, it, expect } from 'vitest';
import { geocodeCandidateStreetLine } from '../lib/geocode-display';

describe('geocodeCandidateStreetLine', () => {
  it('drops a leading POI name from the street line', () => {
    const line = geocodeCandidateStreetLine({
      address: '350 Bleecker St, New York, NY',
      latitude: 40.73,
      longitude: -74.0,
      resolvedAddress:
        'Slightly Alabama, 350, Bleecker Street, West Village, Manhattan, New York, NY, USA',
    });
    expect(line).toBe('350 Bleecker Street');
    expect(line).not.toContain('Alabama');
  });
});
