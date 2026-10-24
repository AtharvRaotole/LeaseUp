import { describe, it, expect } from 'vitest';
import {
  prospectFunnelPlainLine,
  searchVsAbsenceRadiusPlainLine,
} from '../lib/prospect-funnel-copy';
import type { ProspectFunnel } from '@leaseup/contracts';

const sample: ProspectFunnel = {
  brandsScored: 224,
  searchRadiusKm: 10,
  absenceRadiusKm: 3,
  alreadyNearbyCount: 84,
  strongFitAbsentCount: 10,
  pitchedCount: 10,
  verifiedCount: 4,
};

describe('searchVsAbsenceRadiusPlainLine', () => {
  it('explains search vs absence for dense areas', () => {
    const line = searchVsAbsenceRadiusPlainLine(10, 3);
    expect(line).toBe(
      'We search 10 km for shoppers, and count a brand as missing only if it has no store within 3 km, since dense areas are crowded.'
    );
    expect(line).not.toMatch(/[\u2013\u2014]/);
  });

  it('uses Sevierville-style 4 km absence when search matches', () => {
    const line = searchVsAbsenceRadiusPlainLine(4, 4);
    expect(line).toBe(
      'We search 4 km for shoppers, and count a brand as missing only if it has no store within 4 km.'
    );
  });
});

describe('prospectFunnelPlainLine', () => {
  it('explains scored, nearby, and pitched counts without implying they sum to pitched only', () => {
    const line = prospectFunnelPlainLine(sample);
    expect(line).toBe(
      '224 brands scored. 84 already have a store within 3 km. 10 of the 140 without a store in that radius fit local taste and made this pitch list.'
    );
    expect(line).not.toMatch(/[\u2013\u2014]/);
  });
});
