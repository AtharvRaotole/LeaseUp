import { describe, it, expect } from 'vitest';
import {
  dedupeGeocodeCandidatesWithinMeters,
  formatGeocodeCandidateLabel,
  primaryHouseNumber,
} from '../lib/geocode-label';

describe('primaryHouseNumber', () => {
  it('uses the first number when Nominatim returns a list', () => {
    expect(primaryHouseNumber('1600;1628;1630')).toBe('1600');
    expect(primaryHouseNumber('1600, 1628')).toBe('1600');
  });
});

describe('formatGeocodeCandidateLabel', () => {
  it('builds street line from display_name when addressdetails omit road', () => {
    const label = formatGeocodeCandidateLabel(
      'Slightly Alabama, 350, Bleecker Street, West Village, Manhattan, New York, NY, USA'
    );
    expect(label).toContain('350');
    expect(label).toContain('Bleecker');
    expect(label).not.toContain('Alabama');
  });

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

  it('formats Pearl St Boulder with a single leading house number', () => {
    const label = formatGeocodeCandidateLabel(
      '1600;1628;1630 Pearl Street, Boulder, Colorado, United States',
      {
        house_number: '1600;1628;1630',
        road: 'Pearl Street',
        city: 'Boulder',
        state: 'Colorado',
      }
    );
    expect(label).toBe('1600 Pearl Street, Boulder');
    expect(label).not.toContain(';');
  });
});

describe('dedupeGeocodeCandidatesWithinMeters', () => {
  it('drops candidates within 50 meters', () => {
    const a = { latitude: 40.73, longitude: -74.0 };
    const b = { latitude: 40.73001, longitude: -74.00001 };
    expect(dedupeGeocodeCandidatesWithinMeters([a, b], 50)).toHaveLength(1);
  });
});
