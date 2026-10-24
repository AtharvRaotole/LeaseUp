import { describe, it, expect } from 'vitest';
import { prospectFunnelPlainLine } from '../lib/prospect-funnel-copy';
import type { ProspectFunnel } from '@leaseup/contracts';

const sample: ProspectFunnel = {
  brandsScored: 224,
  searchRadiusKm: 10,
  absenceRadiusKm: 1.5,
  alreadyNearbyCount: 42,
  strongFitAbsentCount: 10,
  pitchedCount: 4,
  verifiedCount: 4,
};

describe('prospectFunnelPlainLine', () => {
  it('states scored, nearby, absent, and pitched counts in plain words', () => {
    const line = prospectFunnelPlainLine(sample);
    expect(line).toContain('224 brands scored');
    expect(line).toContain('42 already have a store nearby');
    expect(line).toContain('10 strong local fits have none');
    expect(line).toContain('pitching 4');
    expect(line).toContain('4 verified in two sources');
    expect(line).not.toMatch(/[\u2013\u2014]/);
  });
});
