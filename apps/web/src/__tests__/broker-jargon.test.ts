import { describe, it, expect } from 'vitest';
import {
  rankingBacktestStatTooltip,
  brandsScoredStatTooltip,
  shopperInterestHighlight,
} from '../lib/broker-copy';
import { whyBrandBulletLines } from '../lib/why-brand-lines';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

const JARGON = /\b(auc|white space|over-index|affinity)\b/i;

describe('broker-facing copy avoids jargon', () => {
  it('tooltips stay plain', () => {
    for (const line of [
      rankingBacktestStatTooltip(10),
      brandsScoredStatTooltip(),
      shopperInterestHighlight('Streetwear'),
    ]) {
      expect(line).not.toMatch(JARGON);
      expect(line).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it('why lines avoid over-index wording', () => {
    const prospect = {
      brand: {
        entityId: 'nike',
        name: 'Nike',
        affinity: 1,
        affinityRank: 3,
        verified: 'verified (2 sources)',
        tasteFitBeyondChainPercentile: 82,
      },
      outreachDraft: '',
      reasons: [],
      whyBrandTaste: {
        signals: [{ kind: 'tag', name: 'Running', affinity: 0.8, affinityRank: 1 }],
        summary: 'Qloo ties Nike to Running near this pin.',
      },
    } as ProspectPack;
    const results = { rankings: Array.from({ length: 40 }, () => ({})) } as AnalysisResponse;
    const lines = whyBrandBulletLines(prospect, results, 10);
    const joined = lines.join(' ');
    expect(joined).not.toMatch(/over-index/i);
    expect(joined).not.toMatch(JARGON);
    expect(joined).toContain('Running');
  });
});
