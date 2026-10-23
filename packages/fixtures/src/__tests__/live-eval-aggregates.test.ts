import { describe, expect, it } from 'vitest';
import { loadLiveQlooLiftAggregates } from '../eval/live-qloo-lift/load-aggregates.js';

describe('live-qloo-lift aggregates', () => {
  it('matches committed headline eval numbers', () => {
    const agg = loadLiveQlooLiftAggregates();
    expect(agg.rawQlooPrecisionAt10).toBeCloseTo(0.54, 2);
    expect(agg.chainSizePrecisionAt10).toBeCloseTo(0.76, 2);
    expect(agg.legacyBlendPrecisionAt10).toBeCloseTo(0.59, 2);
    expect(agg.sameSizeAuc.value).toBeCloseTo(0.672, 3);
    expect(agg.sameSizeAuc.ciLow).toBeCloseTo(0.65, 3);
    expect(agg.sameSizeAuc.ciHigh).toBeCloseTo(0.693, 3);
    expect(agg.logisticBlendPrecisionAt10).toBeCloseTo(0.82, 2);
    expect(agg.logisticBlendLiftVsChainPp).toBeCloseTo(6.5, 1);
    expect(agg.heatmapAddsLift).toBe(false);
    expect(agg.fixed10kmSaturates).toBe(true);
  });
});
