import { describe, expect, it } from 'vitest';
import { loadLiveQlooLiftAggregates } from '../eval/live-qloo-lift/load-aggregates.js';

describe('live-qloo-lift aggregates', () => {
  it('matches committed headline eval numbers', () => {
    const agg = loadLiveQlooLiftAggregates();
    expect(agg.rawQlooPrecisionAt10).toBeCloseTo(0.5375, 3);
    expect(agg.chainSizePrecisionAt10).toBeCloseTo(0.76, 3);
    expect(agg.legacyBlendPrecisionAt10).toBeCloseTo(0.59, 2);
    expect(agg.sameSizeAuc.value).toBeCloseTo(0.664, 3);
    expect(agg.sameSizeAuc.ciLow).toBeCloseTo(0.642, 3);
    expect(agg.sameSizeAuc.ciHigh).toBeCloseTo(0.687, 3);
    expect(agg.logisticBlendPrecisionAt10).toBeCloseTo(0.825, 3);
    expect(agg.logisticBlendLiftVsChainPp).toBeCloseTo(6.5, 1);
    expect(agg.heatmapAddsLift).toBe(false);
    expect(agg.fixed10kmSaturates).toBe(true);
  });
});
