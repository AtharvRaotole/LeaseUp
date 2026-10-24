import { describe, it, expect } from 'vitest';
import { prospectAbsenceRadiusKm } from '../eval-density-stratum.js';

describe('prospectAbsenceRadiusKm', () => {
  it('uses 3 km floor for dense urban at 10 km search', () => {
    expect(prospectAbsenceRadiusKm('dense_urban', 10)).toBe(3);
  });

  it('does not exceed search radius below 3 km', () => {
    expect(prospectAbsenceRadiusKm('dense_urban', 1.5)).toBe(1.5);
  });

  it('uses suburban adaptive when larger than 3 km', () => {
    expect(prospectAbsenceRadiusKm('suburban', 10)).toBe(5);
  });
});
