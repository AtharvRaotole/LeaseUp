import { describe, it, expect } from 'vitest';
import { brandExplainabilityForDemo } from '@leaseup/fixtures';

describe('brand explainability fixtures', () => {
  it('loads boulder REI recorded taste rows', () => {
    const row = brandExplainabilityForDemo(
      'boulder',
      '205AF33F-118E-4C49-9721-6BDBAF981DA0'
    );
    expect(row).not.toBeNull();
    expect(row!.tags.length).toBeGreaterThanOrEqual(3);
    expect(row!.tags[0]?.affinityRank).toBeGreaterThan(0);
  });
});
