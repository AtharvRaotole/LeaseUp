import { describe, it, expect } from 'vitest';
import type { BrandRankingRow } from '@leaseup/contracts';
import {
  displayRankForMode,
  sortRankingsForMode,
  activeBacktestForRankingMode,
} from '../lib/ranking-production';
import { rankingModeExplainerSentence } from '../lib/broker-copy';
import { LANDING_WICKER_PREVIEW } from '../data/landing-wicker-preview';
import type { AnalysisResponse } from '@leaseup/contracts';

function row(
  entityId: string,
  blendedRank: number,
  qlooRank: number,
  baselineRank: number
): BrandRankingRow {
  return {
    entityId,
    name: entityId,
    affinity: 1,
    qlooRank,
    blendedRank,
    baselineRank,
    nationalStoreCount: 10,
    presentInRadius: false,
  };
}

describe('sortRankingsForMode', () => {
  it('orders default view by blendedRank, not raw qlooRank', () => {
    const rankings = [
      row('a', 1, 2, 5),
      row('b', 2, 1, 3),
      row('c', 3, 3, 1),
    ];
    const top = sortRankingsForMode(rankings, 'qloo').slice(0, 2);
    expect(top.map((r) => r.entityId)).toEqual(['a', 'b']);
    expect(displayRankForMode(top[0]!, 'qloo')).toBe(1);
    expect(top[0]!.qlooRank).toBe(2);
  });

  it('orders chain-size view by baselineRank', () => {
    const rankings = [row('a', 3, 1, 3), row('b', 1, 2, 1), row('c', 2, 3, 2)];
    const top = sortRankingsForMode(rankings, 'baseline').slice(0, 2);
    expect(top.map((r) => r.entityId)).toEqual(['b', 'c']);
  });
});

describe('activeBacktestForRankingMode', () => {
  it('uses backtestBlended for default toggle and baseline backtest for chain-only', () => {
    const results = LANDING_WICKER_PREVIEW as AnalysisResponse;
    const blend = activeBacktestForRankingMode(results, 'qloo');
    const baseline = activeBacktestForRankingMode(results, 'baseline');
    expect(blend).toBe(results.backtestBlended ?? results.backtest);
    expect(baseline).toBe(results.backtestBaseline);
  });
});

describe('rankingModeExplainerSentence', () => {
  it('states blend vs chain cohort hits without unicode dashes', () => {
    const blend = rankingModeExplainerSentence('qloo');
    const chain = rankingModeExplainerSentence('baseline');
    expect(blend).toMatch(/83%.*76%/);
    expect(blend).toMatch(/40-neighborhood test/);
    expect(chain).toMatch(/76%/);
    expect(chain).not.toMatch(/82%/);
    expect(blend + chain).not.toMatch(/[\u2013\u2014]/);
    expect(blend.toLowerCase()).not.toMatch(/raw qloo.*beat/);
  });
});
