import { describe, it, expect } from 'vitest';
import { prospectFunnelPlainLine } from '../lib/prospect-funnel-copy';
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

describe('prospectFunnelPlainLine', () => {
  it('explains scored, nearby, and pitched counts without implying they sum to pitched only', () => {
    const line = prospectFunnelPlainLine(sample);
    expect(line).toBe(
      '224 brands scored. 84 already have a store within 3 km. 10 of the 140 without a store in that radius fit local taste and made this pitch list.'
    );
    expect(line).not.toMatch(/[\u2013\u2014]/);
  });
});
