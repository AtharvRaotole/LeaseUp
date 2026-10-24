import { describe, it, expect } from 'vitest';
import type { NearbyTenant } from '@leaseup/contracts';
import {
  NEARBY_TENANT_LIST_CAP,
  isBroadNearbyCategoryLabel,
  nearbyCategoryTenantReasonLine,
} from '../lib/nearby-category-tenant-line';

const APPAREL_A = '5D03112C-CD2A-41C3-9ED0-D72EED8BB373';
const APPAREL_B = '81100467-8F5D-4796-B222-A84983379402';
const BEAUTY = '2C5054E1-8691-4F52-83CD-310D029BA6A3';

function tenant(entityId: string, distanceKm: number): NearbyTenant {
  return { entityId, name: 'Tenant', distanceKm };
}

describe('nearbyCategoryTenantReasonLine', () => {
  it('omits when category or nearby tenant data is missing', () => {
    expect(nearbyCategoryTenantReasonLine(undefined, [], 3)).toBeUndefined();
    expect(nearbyCategoryTenantReasonLine('Apparel', undefined, 3)).toBeUndefined();
    expect(nearbyCategoryTenantReasonLine('Apparel', [], 3)).toBeUndefined();
  });

  it('omits broad catch-all categories such as Retail', () => {
    expect(isBroadNearbyCategoryLabel('Retail')).toBe(true);
    expect(
      nearbyCategoryTenantReasonLine('Retail', [tenant(APPAREL_A, 1)], 3)
    ).toBeUndefined();
  });

  it('states zero same-category tracked chains without gap language', () => {
    const line = nearbyCategoryTenantReasonLine(
      'Apparel',
      [tenant(BEAUTY, 1.2)],
      3
    );
    expect(line).toBe('No other tracked apparel chains within 3 km');
    expect(line).not.toMatch(/gap/i);
  });

  it('counts same-category tracked chains within radius', () => {
    const nearby = [
      tenant(APPAREL_A, 0.8),
      tenant(APPAREL_B, 2.1),
      tenant(BEAUTY, 1.5),
    ];
    expect(nearbyCategoryTenantReasonLine('Apparel', nearby, 3)).toBe(
      '2 tracked apparel chains within 3 km'
    );
  });

  it('ignores tenants outside the absence radius', () => {
    const nearby = [tenant(APPAREL_A, 4.5), tenant(APPAREL_B, 2)];
    expect(nearbyCategoryTenantReasonLine('Apparel', nearby, 3)).toBe(
      '1 tracked apparel chain within 3 km'
    );
  });

  it('omits when incumbents exist but none have a mapped category', () => {
    const unknown = '00000000-0000-0000-0000-000000000099';
    expect(
      nearbyCategoryTenantReasonLine('Apparel', [tenant(unknown, 1)], 3)
    ).toBeUndefined();
  });

  it('uses at least wording when the tenant list cap is hit in radius', () => {
    const nearby = Array.from({ length: NEARBY_TENANT_LIST_CAP }, (_, i) =>
      tenant(i % 2 === 0 ? APPAREL_A : BEAUTY, 1 + i * 0.05)
    );
    const line = nearbyCategoryTenantReasonLine('Apparel', nearby, 3, true);
    expect(line).toMatch(/^At least \d+ tracked apparel chains within 3 km$/);
  });

  it('omits zero-count when the tenant list cap is hit in radius', () => {
    const nearby = Array.from({ length: NEARBY_TENANT_LIST_CAP }, () =>
      tenant(BEAUTY, 1.2)
    );
    expect(nearbyCategoryTenantReasonLine('Apparel', nearby, 3, true)).toBeUndefined();
  });
});
