import { describe, expect, it } from 'vitest';
import type { AnalysisResponse } from '@leaseup/contracts';
import { orderProspectsForRankingMode } from '../lib/ranking-mode';

function minimalResults(): AnalysisResponse {
  return {
    location: { address: 'Test', latitude: 0, longitude: 0 },
    backtest: { totalStores: 0, predictedStores: 0, accuracy: 0, precisionAt10: 0, examples: [] },
    prospects: [
      {
        brand: {
          entityId: 'a',
          name: 'TasteFirst',
          affinity: 1,
          affinityRank: 1,
          verified: 'verified (2 sources)',
        },
        outreachDraft: 'Hi',
        reasons: [],
      },
      {
        brand: {
          entityId: 'b',
          name: 'ChainFirst',
          affinity: 1,
          affinityRank: 2,
          verified: 'verified (2 sources)',
        },
        outreachDraft: 'Hi',
        reasons: [],
      },
    ],
    rankings: [
      {
        entityId: 'a',
        name: 'TasteFirst',
        affinity: 1,
        qlooRank: 1,
        blendedRank: 1,
        baselineRank: 50,
        presentInRadius: false,
      },
      {
        entityId: 'b',
        name: 'ChainFirst',
        affinity: 1,
        qlooRank: 2,
        blendedRank: 2,
        baselineRank: 1,
        presentInRadius: false,
      },
    ],
    dataQuality: 'high',
    warnings: [],
    runId: 'r',
    timestamp: '2026-01-01T00:00:00.000Z',
    mode: 'demo',
  };
}

describe('orderProspectsForRankingMode', () => {
  it('keeps taste order in qloo mode', () => {
    const ordered = orderProspectsForRankingMode(minimalResults(), 'qloo');
    expect(ordered.map((p) => p.brand.name)).toEqual(['TasteFirst', 'ChainFirst']);
  });

  it('reorders by chain-size rank in baseline mode', () => {
    const ordered = orderProspectsForRankingMode(minimalResults(), 'baseline');
    expect(ordered.map((p) => p.brand.name)).toEqual(['ChainFirst', 'TasteFirst']);
  });
});
