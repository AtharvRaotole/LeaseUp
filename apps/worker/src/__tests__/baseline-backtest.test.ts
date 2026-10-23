import { describe, it, expect } from 'vitest';
import { wickerparkFixture } from '@leaseup/fixtures';
import { orderInsightsByNationalStoreCount, computeBacktest, filterInsightsToStoreBrands } from '@leaseup/fixtures';

describe('baseline ranking backtest', () => {
  it('differs from Qloo order on Wicker fixture when taste and chain size disagree', () => {
    const insights = filterInsightsToStoreBrands(wickerparkFixture.insights);
    const lat = wickerparkFixture.location.latitude;
    const lon = wickerparkFixture.location.longitude;
    const radiusKm = wickerparkFixture.backtest.radius_km;

    const qloo = computeBacktest(insights, lat, lon, radiusKm);
    const baselineOrder = orderInsightsByNationalStoreCount(insights);
    const baseline = computeBacktest(baselineOrder, lat, lon, radiusKm);

    expect(baseline.presentInTop10).toBeDefined();
    expect(qloo.presentInTop10).toBe(wickerparkFixture.backtest.presentInTop10 ?? qloo.presentInTop10);
    expect(baselineOrder[0]?.entity_id).not.toBe(insights[0]?.entity_id);
  });
});
