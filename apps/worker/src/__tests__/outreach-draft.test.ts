import { describe, it, expect } from 'vitest';
import { buildGroundedSubject } from '../lib/outreach-draft';

describe('buildGroundedSubject', () => {
  it('uses middle dot not em dash', () => {
    const subject = buildGroundedSubject({
      brandName: 'Vans',
      address: '1574 N Milwaukee Ave',
      reasons: [],
      neighborhood: 'Wicker Park',
    });
    expect(subject).toBe('Vans · Wicker Park storefront');
    expect(subject).not.toMatch(/—/);
  });
});
