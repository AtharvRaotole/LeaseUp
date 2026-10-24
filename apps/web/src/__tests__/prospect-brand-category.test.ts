import { describe, it, expect } from 'vitest';
import { prospectBrandCategoryLabel } from '../lib/prospect-brand-category';
import type { ProspectPack } from '@leaseup/contracts';

describe('prospectBrandCategoryLabel', () => {
  it('returns tenantMixScore categoryFit as brand taxonomy label', () => {
    const prospect = {
      brand: { entityId: 'x', name: 'X', affinity: 1, affinityRank: 1, verified: 'unverified' },
      outreachDraft: '',
      reasons: [],
      tenantMixScore: {
        score: 0,
        coAffinityMean: 0,
        categoryFit: 'Apparel',
        explanation: '',
      },
    } as ProspectPack;
    expect(prospectBrandCategoryLabel(prospect)).toBe('Apparel');
  });
});
