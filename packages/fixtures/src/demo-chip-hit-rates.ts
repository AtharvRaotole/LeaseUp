import type { DemoFixtureId } from './demo-addresses.js';
import { boulderFixture } from './boulder.js';
import { seviervilleFixture } from './sevierville.js';
import { wickerparkFixture } from './wicker-park.js';
import { computeBacktest } from './backtest.js';

const DEMO_FIXTURES = {
  wicker: wickerparkFixture,
  boulder: boulderFixture,
  sevierville: seviervilleFixture,
} as const;

/** Present-in-top-10 count from recorded Qloo fixtures vs ATP stores (10 km default). */
export function demoChipPresentInTop10(id: DemoFixtureId, radiusKm = 10): number {
  const fixture = DEMO_FIXTURES[id];
  return computeBacktest(
    fixture.insights,
    fixture.location.latitude,
    fixture.location.longitude,
    radiusKm
  ).presentInTop10;
}

export function demoChipHitRateLabel(id: DemoFixtureId, radiusKm = 10): string {
  return `Hit rate ${demoChipPresentInTop10(id, radiusKm)} of 10`;
}
