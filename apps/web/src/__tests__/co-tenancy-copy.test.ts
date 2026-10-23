import { describe, it, expect } from 'vitest';
import { coTenancyIntroCopy } from '../lib/co-tenancy-copy';

describe('coTenancyIntroCopy', () => {
  it('does not mention storefront sq ft', () => {
    const text = coTenancyIntroCopy(10);
    expect(text).toContain('10 km');
    expect(text).not.toMatch(/sq\s*ft/i);
    expect(text).not.toContain('context');
  });
});
