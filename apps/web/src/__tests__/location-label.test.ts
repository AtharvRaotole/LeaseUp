import { describe, it, expect } from 'vitest';
import { placeHeadlineLabel } from '../lib/location-label';

describe('placeHeadlineLabel', () => {
  it('uses chip slug for demo headlines', () => {
    const location = {
      address: '1574 N Milwaukee Ave, Chicago, IL',
      latitude: 41.91,
      longitude: -87.67,
      neighborhood: 'West Town',
      city: 'Chicago',
    };
    expect(placeHeadlineLabel(location, 'wicker')).toBe('Wicker Park, Chicago');
  });
});
