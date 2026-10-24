import { describe, it, expect } from 'vitest';
import { prospectFunnelPlainLine } from '../lib/prospect-funnel-copy';
import type { ProspectFunnel } from '@leaseup/contracts';

const sample: ProspectFunnel = {
  brandsScored: 224,
  searchRadiusKm: 10,
  absenceRadiusKm: 3,
  alreadyNearbyCount: 42,
  strongFitAbsentCount: 10,
  pitchedCount: 10,
  verifiedCount: 4,
};

describe('prospectFunnelPlainLine', () => {
  it('is one short broker sentence', () => {
    const line = prospectFunnelPlainLine(sample);
    expect(line).toBe(
      '224 brands scored. 42 already have a store within 3 km. These 10 fit local taste and have none.'
    );
    expect(line).not.toMatch(/[\u2013\u2014]/);
  });
});
