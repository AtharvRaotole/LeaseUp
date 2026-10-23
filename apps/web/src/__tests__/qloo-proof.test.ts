import { describe, it, expect } from 'vitest';
import { qlooProofSentence, qlooProofWinner } from '../lib/qloo-proof';
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
});
