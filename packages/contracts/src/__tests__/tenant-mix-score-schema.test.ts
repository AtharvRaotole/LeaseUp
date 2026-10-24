import { describe, it, expect } from 'vitest';
import { TenantMixScoreSchema } from '../index.js';

describe('TenantMixScoreSchema', () => {
  it('accepts categoryFit only and strips legacy placeholder fields', () => {
    const parsed = TenantMixScoreSchema.parse({
      categoryFit: 'Apparel',
      score: 0,
      coAffinityMean: 0,
      explanation: 'legacy',
    });
    expect(parsed).toEqual({ categoryFit: 'Apparel' });
  });
});
