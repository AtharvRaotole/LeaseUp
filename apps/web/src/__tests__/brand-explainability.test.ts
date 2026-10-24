import { describe, it, expect } from 'vitest';
import { brandExplainabilityForDemo } from '@leaseup/fixtures';

describe('brand explainability fixtures', () => {
  it('loads boulder Ulta verified brand x local audience overlap (live Qloo recordings)', () => {
    const row = brandExplainabilityForDemo('boulder', '0F77E9A4-121C-4941-ACE1-28502DBF1865');
    expect(row).not.toBeNull();
    expect(row!.tags).toEqual([]);
    expect(row!.audiences.map((a) => a.name)).toEqual(['Health & Beauty']);
    expect(row!.audiences[0]?.affinityRank).toBeGreaterThan(0);
    expect(row!.provenance.host).toBe('https://hackathon.api.qloo.com');
  });
});
