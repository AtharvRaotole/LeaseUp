import { describe, it, expect } from 'vitest';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { whyBrandBulletLines } from '../lib/why-brand-lines';
import { expectTopPercentsMatchRank } from '../lib/rank-top-percent-copy';

describe('whyBrandBulletLines', () => {
  it('uses one top percent aligned with rank 26 of 224', () => {
    const prospect = {
      brand: {
        entityId: 'ulta',
        name: 'Ulta Beauty',
        affinity: 0.8,
        affinityRank: 26,
        verified: 'unverified',
      },
      reasons: [],
      outreachDraft: '',
    } as ProspectPack;
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

    const lines = whyBrandBulletLines(prospect, results, 10);
    const joined = lines.join(' ');
    expectTopPercentsMatchRank(joined, 26, 224);
    expect(lines[0]).toContain('top 12%');
    expect(joined).not.toMatch(/top 15%/i);
    expect(joined).not.toMatch(/top 8%/i);
  });
});
