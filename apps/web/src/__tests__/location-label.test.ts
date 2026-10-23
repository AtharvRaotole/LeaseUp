import { describe, it, expect } from 'vitest';
import { wickerparkFixture } from '@leaseup/fixtures';
import { placeHeadlineLabel } from '../lib/location-label';

describe('placeHeadlineLabel', () => {
  it('prefers demo chip name when coords are within 300 m of Wicker Park', () => {
    const location = {
      address: '1574 N Milwaukee Ave, Chicago, IL',
      latitude: wickerparkFixture.location.latitude,
      longitude: wickerparkFixture.location.longitude,
      neighborhood: 'West Town',
      city: 'Chicago',
    };
    expect(placeHeadlineLabel(location)).toBe('Wicker Park, Chicago');
  });
});
