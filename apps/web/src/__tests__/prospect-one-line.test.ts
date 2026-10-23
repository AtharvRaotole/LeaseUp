import { describe, it, expect } from 'vitest';
import { prospectOneLineReason } from '../lib/prospect-one-line';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

const baseResults = {
  rankings: Array.from({ length: 100 }, (_, i) => ({
    entityId: `e${i}`,
    name: `Brand ${i}`,
    affinity: 0.5,
    qlooRank: i + 1,
    blendedRank: i + 1,
    presentInRadius: false,
  })),
} as AnalysisResponse;

function prospect(overrides: Partial<ProspectPack> & { brand?: Partial<ProspectPack['brand']> }): ProspectPack {
  const { brand: brandOverrides, ...rest } = overrides;
  return {
    brand: {
      entityId: 'brand-a',
      name: 'Brand A',
      affinity: 0.9,
      affinityRank: 6,
      verified: 'unverified',
      ...brandOverrides,
    },
    outreachDraft: '',
    reasons: [
      'Prospect ordering uses the fitted taste-aware blend (Qloo rank, chain size, and trade-area density)',
    ],
    ...rest,
  } as ProspectPack;
}

describe('prospectOneLineReason', () => {
  it('ignores methodology strings in reasons and builds from payload fields', () => {
    const line = prospectOneLineReason(
      prospect({
        nearestExistingStoreKm: 12,
        tenantMixScore: { score: 1, coAffinityMean: 1, categoryFit: 'Apparel', explanation: '' },
      }),
      baseResults,
      10
    );
    expect(line).toContain('Top 6% taste match here');
    expect(line).toContain('Nearest store is 12 km away');
    expect(line).toContain('Apparel');
    expect(line).not.toContain('taste-aware blend');
  });

  it('produces different copy for two brands with different data', () => {
    const a = prospectOneLineReason(
      prospect({
        brand: { entityId: 'a', name: 'Alpha', affinity: 0.9, affinityRank: 6, verified: 'unverified' },
        nearestExistingStoreKm: 12,
        tradeAreaTaste: { tags: [{ entityId: 't1', name: 'Streetwear', affinity: 0.8, affinityRank: 1 }], audiences: [] },
      }),
      baseResults,
      10
    );
    const b = prospectOneLineReason(
      prospect({
        brand: {
          entityId: 'b',
          name: 'Beta',
          affinity: 0.8,
          affinityRank: 20,
          verified: 'unverified',
          tasteFitBeyondChainPercentile: 82,
        },
        nearestExistingStoreKm: 4.2,
        tenantMixScore: { score: 1, coAffinityMean: 1, categoryFit: 'Coffee', explanation: '' },
      }),
      baseResults,
      10
    );
    expect(a).not.toBe(b);
    expect(a).toContain('Streetwear');
    expect(b).toContain('Top 18% local match here');
    expect(b).toContain('Coffee');
  });
});
