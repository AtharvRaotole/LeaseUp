import { describe, it, expect } from 'vitest';
import {
  qlooProofBrokerBanner,
  qlooProofSentence,
  qlooProofTieDetail,
  qlooProofWinner,
} from '../lib/qloo-proof';
import type { AnalysisResponse, BacktestResult } from '@leaseup/contracts';
import { LANDING_WICKER_PREVIEW } from '../data/landing-wicker-preview';

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

describe('qlooProofBrokerBanner', () => {
  it('uses plain broker copy with 9 vs 7 for Wicker from recorded eval', () => {
    const copy = qlooProofBrokerBanner(LANDING_WICKER_PREVIEW as AnalysisResponse);
    expect(copy.headline).toMatch(/9 of its top 10/);
    expect(copy.headline).toMatch(/7 of 10 using store count alone/);
    expect(copy.headline).not.toMatch(/AUC/);
    expect(copy.cohortLine).toMatch(/Across 40 US neighborhoods/);
    expect(copy.cohortLine).toMatch(/83% vs 76%/);
    expect(copy.cohortLine).toMatch(/\+6\.5 pp/);
  });
});

describe('qlooProofSentence', () => {
  it('formats computed hit counts', () => {
    expect(qlooProofSentence(bt(8), bt(4))).toBe(
      'Taste-aware ranking: 8 of 10 top picks already have a store nearby. Store count only: 4 of 10.'
    );
  });

  it('detects when baseline wins', () => {
    expect(qlooProofWinner(bt(3), bt(6))).toBe('baseline');
  });

  it('explains tie with row movement using production blend rank', () => {
    const detail = qlooProofTieDetail([
      {
        entityId: 'a',
        name: 'REI',
        affinity: 1,
        qlooRank: 5,
        blendedRank: 1,
        baselineRank: 42,
        nationalStoreCount: 1,
        presentInRadius: true,
      },
      {
        entityId: 'b',
        name: 'Chick-fil-A',
        affinity: 0.5,
        qlooRank: 1,
        blendedRank: 15,
        baselineRank: 1,
        nationalStoreCount: 99,
        presentInRadius: true,
      },
    ]);
    expect(detail).toMatch(/Same nearby-store count/);
    expect(detail).toMatch(/REI/);
    expect(detail).toMatch(/LeaseUp #1/);
  });
});

describe('twinRankingLine', () => {
  it('names the taste twins only when the live order used them', async () => {
    const { twinRankingLine } = await import('../lib/qloo-proof');
    const base = LANDING_WICKER_PREVIEW as AnalysisResponse;
    expect(twinRankingLine(base)).toBeNull();
    expect(twinRankingLine({ ...base, rankingModel: { kind: 'standard' } })).toBeNull();
    const line = twinRankingLine({
      ...base,
      rankingModel: {
        kind: 'taste_twins',
        twins: [
          { id: 'a', label: 'Wellesley, MA' },
          { id: 'b', label: 'Bethesda, MD' },
        ],
      },
    });
    expect(line).toMatch(/2 test markets whose Qloo taste is closest to this site: Wellesley, MA and Bethesda, MD\./);
    expect(line).toMatch(/from 8\.2 to 9 of 10/);
    expect(line).not.toMatch(/[\u2013\u2014]/);
    const three = twinRankingLine({
      ...base,
      rankingModel: {
        kind: 'taste_twins',
        twins: [
          { id: 'a', label: 'Wellesley, MA' },
          { id: 'b', label: 'Bethesda, MD' },
          { id: 'c', label: 'Edina, MN' },
        ],
      },
    });
    expect(three).toMatch(/closest to this site: Wellesley, MA; Bethesda, MD; and Edina, MN\./);
  });
});
