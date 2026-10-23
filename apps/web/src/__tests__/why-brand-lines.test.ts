import { describe, it, expect } from 'vitest';
import { whyBrandBulletLines } from '../lib/why-brand-lines';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

describe('whyBrandBulletLines', () => {
  it('includes trade area tags when present', () => {
    const prospect = {
      brand: {
        entityId: '205AF33F-118E-4C49-9721-6BDBAF981DA0',
        name: 'REI',
        affinity: 0.9,
        affinityRank: 1,
        verified: 'unverified (1 source)',
        verificationSources: ['All The Places (CC0)'],
      },
      tradeAreaTaste: {
        tags: [
          {
            entityId: 'urn:tag:test',
            name: 'Hiking',
            affinity: 0.89,
            affinityRank: 0.87,
          },
        ],
        audiences: [],
      },
      reasons: [],
      outreachDraft: '',
    } as ProspectPack;
    const results = { rankings: [{ entityId: 'x' }] } as AnalysisResponse;
    const lines = whyBrandBulletLines(prospect, results, 10);
    expect(lines.some((l) => l.includes('Interests that stand out'))).toBe(true);
    expect(lines.some((l) => l.includes('Hiking'))).toBe(true);
  });
});
