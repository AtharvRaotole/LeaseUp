import { describe, it, expect } from 'vitest';
import { wickerLandingPitchTopNames } from '@leaseup/fixtures';
import { LANDING_WICKER_PREVIEW } from '../data/landing-wicker-preview';

describe('landing hero fixture frame data', () => {
  it('uses the first three Wicker prospects from the recorded fixture', () => {
    const top = LANDING_WICKER_PREVIEW.prospects.slice(0, 3).map((p) => p.brand.name);
    expect(top).toEqual(wickerLandingPitchTopNames(3));
    expect(LANDING_WICKER_PREVIEW.location.neighborhood).toBe('Wicker Park');
  });
});
