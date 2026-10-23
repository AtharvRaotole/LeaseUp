import { describe, it, expect } from 'vitest';
import {
  qlooEvalHeadlineParts,
  qlooProofSentence,
  qlooProofTieDetail,
  qlooProofWinner,
} from '../lib/qloo-proof';
import type { BacktestResult } from '@leaseup/contracts';

function bt(present: number): BacktestResult {
  return {
    totalStores: present,
    predictedStores: present,
    accuracy: present / 10,
    precisionAt10: present / 10,
    presentInTop10: present,
    examples: [],
  };
}

describe('qlooEvalHeadlineParts', () => {
  it('states same-size AUC and does not claim raw Qloo beats chain size', () => {
    const { headline, companion, caveat } = qlooEvalHeadlineParts();
    expect(headline).toMatch(/two-thirds of the time/);
    expect(headline).toMatch(/0\.67/);
    expect(companion).toMatch(/82%/);
    expect(companion).toMatch(/76%/);
    expect(caveat).toMatch(/partly reflect/);
    expect(headline.toLowerCase()).not.toMatch(/raw qloo beats/);
  });
});

describe('qlooProofSentence', () => {
  it('formats computed hit counts', () => {
    expect(qlooProofSentence(bt(8), bt(4))).toBe(
      'Local taste ranking: 8 of 10 top picks already have a store nearby. Ranking by chain size only: 4 of 10.'
    );
  });

  it('detects when baseline wins', () => {
    expect(qlooProofWinner(bt(3), bt(6))).toBe('baseline');
  });

  it('explains tie with row movement', () => {
    const detail = qlooProofTieDetail([
      {
        entityId: 'a',
        name: 'REI',
        affinity: 1,
        qlooRank: 1,
        blendedRank: 1,
        baselineRank: 42,
        nationalStoreCount: 1,
        presentInRadius: true,
      },
      {
        entityId: 'b',
        name: 'Chick-fil-A',
        affinity: 0.5,
        qlooRank: 15,
        blendedRank: 15,
        baselineRank: 1,
        nationalStoreCount: 99,
        presentInRadius: true,
      },
    ]);
    expect(detail).toMatch(/Same nearby-store count/);
    expect(detail).toMatch(/REI/);
  });
});
