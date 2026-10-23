import { describe, expect, it } from 'vitest';
import { brandReachForEntity } from '../lib/brand-reach';

describe('brandReachForEntity', () => {
  it('returns verified Starbucks contact', () => {
    const reach = brandReachForEntity('B13C02E3-BA3C-4B39-85B4-ACF12FEBC892');
    expect(reach?.status).toBe('verified');
    expect(reach?.url).toContain('starbucks');
  });
});
