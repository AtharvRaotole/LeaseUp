import { describe, expect, it } from 'vitest';
import { brandReachForEntity } from '../lib/brand-reach';

const STARBUCKS = 'B13C02E3-BA3C-4B39-85B4-ACF12FEBC892';
const FOOT_LOCKER = '4C160FEA-FDB6-4DEC-99FC-13899680A0F4';

describe('brandReachForEntity', () => {
  it('returns verified Foot Locker contact from fixtures', () => {
    const reach = brandReachForEntity(FOOT_LOCKER);
    expect(reach?.status).toBe('verified');
    expect(reach?.url).toContain('footlocker.com');
  });

  it('returns search fallback when no verified real-estate page', () => {
    const reach = brandReachForEntity(STARBUCKS);
    expect(reach?.status).toBe('not_yet_found');
    expect(reach?.searchUrl).toContain('google.com/search');
  });
});
