import { describe, expect, it } from 'vitest';
import { loadLiveQlooLiftAggregates } from '../eval/live-qloo-lift/load-aggregates.js';

describe('live-qloo-lift aggregates', () => {
  it('matches committed headline eval numbers', () => {
    const agg = loadLiveQlooLiftAggregates();
    expect(agg.rawQlooPrecisionAt10).toBeCloseTo(0.5375, 3);
    expect(agg.chainSizePrecisionAt10).toBeCloseTo(0.755, 3);
    expect(agg.legacyBlendPrecisionAt10).toBeCloseTo(0.59, 2);
    expect(agg.sameSizeAuc.value).toBeCloseTo(0.667, 3);
    expect(agg.sameSizeAuc.ciLow).toBeCloseTo(0.646, 3);
    expect(agg.sameSizeAuc.ciHigh).toBeCloseTo(0.689, 3);
    expect(agg.logisticBlendPrecisionAt10).toBeCloseTo(0.8175, 3);
    expect(agg.logisticBlendLiftVsChainPp).toBeCloseTo(6.25, 1);
    expect(agg.heatmapAddsLift).toBe(false);
    expect(agg.fixed10kmSaturates).toBe(true);
  });
});
