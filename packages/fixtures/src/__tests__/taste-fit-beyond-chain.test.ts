import { describe, expect, it } from 'vitest';
import { buildTierFitByEntityId, tasteFitPercentileWithinTier } from '../taste-fit-beyond-chain.js';
import { wickerparkFixture } from '../wicker-park.js';

describe('tasteFitBeyondChain', () => {
  it('computes tier percentiles without using raw affinity decimals', () => {
    const ids = wickerparkFixture.insights.slice(0, 30).map((i) => i.entity_id);
    const map = buildTierFitByEntityId(ids);
    const first = map.get(ids[0]!);
    expect(first?.tasteFitBeyondChainPercentile).toBeGreaterThanOrEqual(1);
    expect(first?.tasteFitBeyondChainPercentile).toBeLessThanOrEqual(99);
  });

  it('ranks best in tier at high percentile', () => {
    expect(tasteFitPercentileWithinTier(1, 10)).toBe(99);
    expect(tasteFitPercentileWithinTier(10, 10)).toBe(1);
  });
});
