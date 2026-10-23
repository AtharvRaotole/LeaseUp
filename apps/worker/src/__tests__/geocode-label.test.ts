import { describe, it, expect } from 'vitest';
import {
  dedupeGeocodeCandidatesWithinMeters,
  formatGeocodeCandidateLabel,
} from '../lib/geocode-label';

describe('formatGeocodeCandidateLabel', () => {
  it('formats street, neighborhood, borough without POI prefix', () => {
    const label = formatGeocodeCandidateLabel(
      'Slightly Alabama, 350, Bleecker Street, Manhattan, New York, NY, USA',
      {
        house_number: '350',
        road: 'Bleecker Street',
        neighbourhood: 'West Village',
        borough: 'Manhattan',
        city: 'New York',
      }
    );
    expect(label).toBe('350 Bleecker Street, West Village, Manhattan');
    expect(label).not.toContain('Alabama');
  });
});

describe('dedupeGeocodeCandidatesWithinMeters', () => {
  it('drops candidates within 50 meters', () => {
    const a = { latitude: 40.73, longitude: -74.0 };
    const b = { latitude: 40.73001, longitude: -74.00001 };
    expect(dedupeGeocodeCandidatesWithinMeters([a, b], 50)).toHaveLength(1);
  });
});
