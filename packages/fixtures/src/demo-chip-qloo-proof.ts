import type { DemoFixtureId } from './demo-addresses.js';
import { boulderFixture } from './boulder.js';
import { seviervilleFixture } from './sevierville.js';
import { wickerparkFixture } from './wicker-park.js';
import { computeBacktest } from './backtest.js';
import { orderInsightsByNationalStoreCount } from './ranking.js';
import { getStoreBrandIdSet } from './store-geo.js';

const DEMO_FIXTURES = {
  wicker: wickerparkFixture,
  boulder: boulderFixture,
  sevierville: seviervilleFixture,
} as const;

export type DemoChipQlooProof = {
  id: DemoFixtureId;
  qlooPresentInTop10: number;
  baselinePresentInTop10: number;
  lift: number;
};

export function demoChipQlooProof(id: DemoFixtureId, radiusKm = 10): DemoChipQlooProof {
  const fixture = DEMO_FIXTURES[id];
  const { latitude, longitude } = fixture.location;
  const qloo = computeBacktest(fixture.insights, latitude, longitude, radiusKm);
  const baseline = computeBacktest(
    orderInsightsByNationalStoreCount(fixture.insights),
    latitude,
    longitude,
    radiusKm
  );
  return {
    id,
    qlooPresentInTop10: qloo.presentInTop10,
    baselinePresentInTop10: baseline.presentInTop10,
    lift: qloo.presentInTop10 - baseline.presentInTop10,
  };
}

export type DemoChipRankMover = {
  name: string;
  qlooRank: number;
  baselineRank: number;
};

/** Brands whose Qloo vs chain-size rank differs within the demo fixture pool. */
export function demoChipTopRankMovers(id: DemoFixtureId, take = 3): DemoChipRankMover[] {
  const fixture = DEMO_FIXTURES[id];
  const brandIds = getStoreBrandIdSet();
  const baselineOrdered = orderInsightsByNationalStoreCount(fixture.insights);
  const baselineRankById = new Map(
    baselineOrdered.map((row, index) => [row.entity_id, index + 1])
  );

  const movers: DemoChipRankMover[] = [];
  let qlooRank = 0;
  for (const insight of fixture.insights) {
    if (!brandIds.has(insight.entity_id)) continue;
    qlooRank += 1;
    const baselineRank = baselineRankById.get(insight.entity_id) ?? qlooRank;
    if (baselineRank === qlooRank) continue;
    const inQlooTop = qlooRank <= 10;
    const inBaselineTop = baselineRank <= 10;
    if (!inQlooTop && !inBaselineTop) continue;
    movers.push({
      name: insight.name,
      qlooRank,
      baselineRank,
    });
  }

  movers.sort((a, b) => {
    const deltaA = Math.abs(a.baselineRank - a.qlooRank);
    const deltaB = Math.abs(b.baselineRank - b.qlooRank);
    if (deltaB !== deltaA) return deltaB - deltaA;
    return Math.min(a.qlooRank, a.baselineRank) - Math.min(b.qlooRank, b.baselineRank);
  });

  return movers.slice(0, take);
}

/** Landing chips: Qloo lift first, then ties, then baseline wins last. */
export function demoChipIdsByQlooLift(): DemoFixtureId[] {
  const ids = Object.keys(DEMO_FIXTURES) as DemoFixtureId[];
  return [...ids].sort((a, b) => {
    const liftA = demoChipQlooProof(a).lift;
    const liftB = demoChipQlooProof(b).lift;
    if (liftB !== liftA) return liftB - liftA;
    const qA = demoChipQlooProof(a).qlooPresentInTop10;
    const qB = demoChipQlooProof(b).qlooPresentInTop10;
    return qB - qA;
  });
}

export function demoChipProofHitRateLabel(id: DemoFixtureId, radiusKm = 10): string {
  const { qlooPresentInTop10, baselinePresentInTop10, lift } = demoChipQlooProof(id, radiusKm);
  if (lift > 0) {
    return `Qloo ${qlooPresentInTop10} of 10 · without taste ${baselinePresentInTop10} of 10`;
  }
  if (lift < 0) {
    return `Qloo ${qlooPresentInTop10} of 10 · chain size ${baselinePresentInTop10} of 10`;
  }
  return `Hit rate ${qlooPresentInTop10} of 10 (tied without taste)`;
}
