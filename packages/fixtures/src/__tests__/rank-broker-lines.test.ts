import { describe, it, expect } from 'vitest';
import {
  assertTopPercentCopyMatchesRank,
  brandRankSurfaceStrings,
  fitPercentileShortLabel,
  tasteMatchHerePhrase,
  whyBrandRankSummaryLine,
} from '../rank-broker-lines.js';

describe('rank broker lines', () => {
  it('uses ceil(rank/total) on rank 26 of 224', () => {
    expect(whyBrandRankSummaryLine(26, 224)).toContain('top 12%');
    const joined = brandRankSurfaceStrings(26, 224, 'Ulta: LeaseUp rank #26 (top 12% of 224 brands) for Boulder').join(
      '\n'
    );
    assertTopPercentCopyMatchesRank(joined, 26, 224);
  });

  it('throws when top percent disagrees with rank', () => {
    expect(() => assertTopPercentCopyMatchesRank('top 15% here', 26, 224)).toThrow();
  });

  it('uses rank wording instead of top percent for weak fits', () => {
    expect(tasteMatchHerePhrase(206, 224)).toBe('#206 of 224 for local taste');
    expect(fitPercentileShortLabel(206, 224)).toBe('#206 of 224 for local taste');
    expect(whyBrandRankSummaryLine(206, 224)).toContain('lower local match');
    expect(whyBrandRankSummaryLine(206, 224)).not.toMatch(/top \d+%/i);
  });
});
