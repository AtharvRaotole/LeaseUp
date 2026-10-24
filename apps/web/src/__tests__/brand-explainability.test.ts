import { describe, it, expect } from 'vitest';
import { brandExplainabilityForDemo } from '@leaseup/fixtures';

describe('brand explainability fixtures', () => {
  it('loads boulder Ulta recorded taste rows', () => {
    const row = brandExplainabilityForDemo(
      'boulder',
      '0F77E9A4-121C-4941-ACE1-28502DBF1865'
    );
    expect(row).not.toBeNull();
    expect(row!.tags.length).toBeGreaterThanOrEqual(3);
    expect(row!.tags[0]?.affinityRank).toBeGreaterThan(0);
  });
});
