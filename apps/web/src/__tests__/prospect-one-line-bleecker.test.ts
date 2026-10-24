import { describe, it, expect } from 'vitest';
import { BLEECKER_LIKE_NON_RETAIL_TASTE } from '@leaseup/fixtures';
import { prospectOneLineReason } from '../lib/prospect-one-line';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

describe('prospectOneLineReason Bleecker-like taste', () => {
  it('omits shopper-interest sentence when only non-retail Qloo tags are present', () => {
    const prospect = {
      brand: {
        entityId: 'home-brand',
        name: 'HomeGoods',
        affinity: 0.9,
        affinityRank: 12,
        verified: 'unverified (1 source)',
      },
      outreachDraft: '',
      reasons: [],
      tradeAreaTaste: {
        tags: BLEECKER_LIKE_NON_RETAIL_TASTE,
        audiences: [],
      },
      tenantMixScore: { categoryFit: 'Home' },
    } as ProspectPack;

    const results = {
      rankings: Array.from({ length: 200 }, (_, i) => ({
        entityId: i === 11 ? 'home-brand' : `e-${i}`,
        name: 'Brand',
        affinity: 0.5,
        qlooRank: i + 1,
        blendedRank: i + 1,
        presentInRadius: false,
      })),
    } as AnalysisResponse;

    const line = prospectOneLineReason(prospect, results, 10);
    expect(line).not.toMatch(/shop more for/i);
    expect(line).not.toContain('Hotel');
    expect(line).not.toContain('Self Help');
    expect(line).not.toContain('American');
    expect(line).not.toContain('Category fit');
  });
});
