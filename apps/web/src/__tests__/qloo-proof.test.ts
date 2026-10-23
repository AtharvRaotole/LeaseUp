import { describe, it, expect } from 'vitest';
import {
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

describe('qlooProofSentence', () => {
  it('formats computed hit counts', () => {
    expect(qlooProofSentence(bt(8), bt(4))).toBe(
      'Without taste data: 4 of 10. With Qloo: 8 of 10.'
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
    expect(detail).toMatch(/Same hit count/);
    expect(detail).toMatch(/REI/);
  });
});
