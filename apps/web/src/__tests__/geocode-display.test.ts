import { describe, it, expect } from 'vitest';
import {
  geocodeCandidateStreetLine,
  geocodeCandidateSubtitle,
  geocodeCandidateTitle,
  postalCodeFromResolved,
} from '../lib/geocode-display';
import type { GeocodeCandidate } from '@leaseup/contracts';

const candidate: GeocodeCandidate = {
  address: '1574 N Milwaukee Ave, Chicago',
  latitude: 41.91,
  longitude: -87.68,
  neighborhood: 'Wicker Park',
  city: 'Chicago',
  resolvedAddress: '1574 N Milwaukee Ave, Chicago, IL 60622',
};

describe('geocode-display', () => {
  it('formats title and subtitle with ZIP', () => {
    expect(geocodeCandidateTitle(candidate)).toBe('Wicker Park');
    expect(geocodeCandidateSubtitle(candidate)).toBe('Chicago, 60622');
    expect(postalCodeFromResolved(candidate.resolvedAddress)).toBe('60622');
  });

  it('shows street line without semicolon house lists', () => {
    expect(
      geocodeCandidateStreetLine({
        ...candidate,
        resolvedAddress: '1600 Pearl Street, Boulder, Colorado, 80302, United States',
      })
    ).toBe('1600 Pearl Street');
  });
});
