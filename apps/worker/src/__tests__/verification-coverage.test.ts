import { describe, it, expect } from 'vitest';
import { metroStoreCoverageIncomplete } from '../lib/verification-coverage';

describe('metroStoreCoverageIncomplete', () => {
  it('flags REI-style ATP gap near Manhattan when OSM has metro stores', () => {
    const result = metroStoreCoverageIncomplete({
      nationalStoreCount: 193,
      nearestAtpKm: undefined,
      nearestOsmKm: 32,
    });
    expect(result.incomplete).toBe(true);
  });

  it('allows verify when both sources list stores within 50 km', () => {
    const result = metroStoreCoverageIncomplete({
      nationalStoreCount: 193,
      nearestAtpKm: 1.6,
      nearestOsmKm: 1.6,
    });
    expect(result.incomplete).toBe(false);
  });
});
