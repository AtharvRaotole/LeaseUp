import { describe, it, expect } from 'vitest';
import {
  tasteFitMatchHerePhrase,
  fitPercentileLabel,
  fitTopPercent,
} from '../lib/fit-display';
import { whyBrandRankSummaryLine } from '../lib/why-brand-lines';
import { expectTopPercentsMatchRank } from '../lib/rank-top-percent-copy';

describe('fitTopPercent from list rank', () => {
  it('uses ceil(rank/total*100)', () => {
    expect(fitTopPercent(26, 224)).toBe(12);
    expect(fitTopPercent(40, 200)).toBe(20);
    expect(fitTopPercent(10, 200)).toBe(5);
  });

  it('writes one local match percent from rank and total', () => {
    expect(tasteFitMatchHerePhrase(26, 224)).toBe('Top 12% local match here');
    expect(fitPercentileLabel(26, 224)).toBe('Top 12% local match');
  });

  it('matches why card summary line', () => {
    expect(whyBrandRankSummaryLine(26, 224)).toBe(
      '#26 of 224 brands we scored (top 12% for local shopper taste).'
    );
  });
});

describe('expectTopPercentsMatchRank', () => {
  it('fails when stated top percent disagrees with rank', () => {
    expect(() =>
      expectTopPercentsMatchRank('top 15% of 224 brands', 26, 224)
    ).toThrow();
  });
});
