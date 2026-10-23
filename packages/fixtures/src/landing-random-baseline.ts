import { filterInsightsToStoreBrands } from './backtest.js';
import { boulderFixture } from './boulder.js';
import { seviervilleFixture } from './sevierville.js';
import { wickerparkFixture } from './wicker-park.js';
import { findStoresNearby } from './store-geo.js';
import type { DemoFixtureId } from './demo-addresses.js';

const DEMO_FIXTURES = {
  wicker: wickerparkFixture,
  boulder: boulderFixture,
  sevierville: seviervilleFixture,
} as const;

/**
 * Expected present-in-radius count when drawing 10 brands uniformly at random
 * from the fixture pool (hypergeometric mean, store-brand filtered).
 */
export function expectedRandomPresentInTop10(
  insights: Array<{ entity_id: string; name: string }>,
  lat: number,
  lon: number,
  radiusKm = 10
): number {
  const ranked = filterInsightsToStoreBrands(insights);
  if (ranked.length === 0) return 0;

  let presentInPool = 0;
  for (const row of ranked) {
    if (findStoresNearby(row.entity_id, lat, lon, radiusKm).length > 0) {
      presentInPool += 1;
    }
  }

  const draw = Math.min(10, ranked.length);
  return (draw * presentInPool) / ranked.length;
}

export type DemoRandomBaselineSummary = {
  meanExpectedRandom: number;
  meanQlooTop10: number;
};

export function demoChipsRandomBaselineSummary(radiusKm = 10): DemoRandomBaselineSummary {
  const ids = Object.keys(DEMO_FIXTURES) as DemoFixtureId[];
  let randomSum = 0;
  let qlooSum = 0;

  for (const id of ids) {
    const fixture = DEMO_FIXTURES[id];
    randomSum += expectedRandomPresentInTop10(
      fixture.insights,
      fixture.location.latitude,
      fixture.location.longitude,
      radiusKm
    );
    const ranked = filterInsightsToStoreBrands(fixture.insights);
    let presentTop10 = 0;
    for (const row of ranked.slice(0, 10)) {
      if (
        findStoresNearby(
          row.entity_id,
          fixture.location.latitude,
          fixture.location.longitude,
          radiusKm
        ).length > 0
      ) {
        presentTop10 += 1;
      }
    }
    qlooSum += presentTop10;
  }

  return {
    meanExpectedRandom: randomSum / ids.length,
    meanQlooTop10: qlooSum / ids.length,
  };
}
