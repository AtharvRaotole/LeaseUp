import { describe, it, expect } from 'vitest';
import {
  coTenancyIntroCopy,
  formatNearbyTenantsList,
} from '../lib/co-tenancy-copy';

describe('coTenancyIntroCopy', () => {
  it('does not mention storefront sq ft', () => {
    const text = coTenancyIntroCopy(10);
    expect(text).toContain('10 km');
    expect(text).not.toMatch(/sq\s*ft/i);
    expect(text).not.toContain('context');
  });
});

describe('formatNearbyTenantsList', () => {
  it('lists tenant names and truncates with a more suffix', () => {
    const tenants = Array.from({ length: 14 }, (_, i) => ({
      entityId: `id-${i}`,
      name: `Brand${i}`,
      distanceKm: i * 0.1,
    }));
    const text = formatNearbyTenantsList(tenants, 12);
    expect(text).toMatch(/^Nearby tenants:/);
    expect(text).toContain('Brand0');
    expect(text).toContain('and 2 more');
  });

  it('returns empty string when no tenants', () => {
    expect(formatNearbyTenantsList([])).toBe('');
  });
});
