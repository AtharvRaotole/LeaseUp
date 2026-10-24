import { describe, it, expect } from 'vitest';
import { whyBrandTasteSection } from '../lib/why-brand-taste-ui';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

const results = {
  rankings: Array.from({ length: 224 }, (_, i) => ({
    entityId: i === 25 ? 'ulta' : `e-${i}`,
    name: 'Brand',
    affinity: 0.5,
    qlooRank: i + 1,
    blendedRank: i + 1,
    presentInRadius: false,
  })),
} as AnalysisResponse;

describe('whyBrandTasteSection', () => {
  it('prefers whyBrandTaste signals over legacy reasons', () => {
    const prospect = {
      brand: {
        entityId: 'ulta',
        name: 'Ulta',
        affinity: 0.99,
        affinityRank: 26,
        verified: 'unverified (1 source)',
        nationalStoreCount: 100,
        nearbyStoreCount: 0,
      },
      outreachDraft: '',
      reasons: ['No Ulta store within 3 km (ATP catalog)'],
      whyBrandTaste: {
        signals: [
          { kind: 'tag', name: 'Skincare', affinity: 0.91, affinityRank: 0.9 },
          { kind: 'audience', name: 'Beauty Shoppers', affinity: 0.88, affinityRank: 0.86 },
        ],
        summary: 'Qloo ties Ulta to Skincare and Beauty Shoppers near this pin.',
      },
    } as ProspectPack;

    const section = whyBrandTasteSection(prospect, results);
    expect(section.summary).toContain('Ulta');
    expect(section.signalLines.length).toBe(2);
    expect(section.rankLine).toContain('top 12%');
  });
});
