import { describe, it, expect } from 'vitest';
import {
  geocodeCandidateSubtitle,
  geocodeCandidateTitle,
  mapThumbnailUrl,
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

  it('builds carto thumbnail url', () => {
    const url = mapThumbnailUrl(41.91, -87.68);
    expect(url).toMatch(/^https:\/\/basemaps\.cartocdn\.com\/light_all\/14\/\d+\/\d+\.png$/);
  });
});
