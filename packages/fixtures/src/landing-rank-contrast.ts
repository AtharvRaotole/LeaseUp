import { filterInsightsToStoreBrands } from './backtest.js';
import { boulderFixture } from './boulder.js';
import { seviervilleFixture } from './sevierville.js';
import { wickerparkFixture } from './wicker-park.js';

export type NeighborhoodRankLabel = 'Wicker Park' | 'Pearl Street' | 'Sevierville';

export type LandingRankContrastRow = {
  brandName: string;
  rankA: number;
  rankB: number;
  labelA: NeighborhoodRankLabel;
  labelB: NeighborhoodRankLabel;
};

const FIXTURES = {
  wicker: { fixture: wickerparkFixture, label: 'Wicker Park' as const },
  boulder: { fixture: boulderFixture, label: 'Pearl Street' as const },
  sevierville: { fixture: seviervilleFixture, label: 'Sevierville' as const },
};

type FixtureKey = keyof typeof FIXTURES;

function rankMap(fixture: { insights: Array<{ entity_id: string; name: string }> }) {
  const ranked = filterInsightsToStoreBrands(fixture.insights);
  const map = new Map<string, { rank: number; name: string }>();
  ranked.forEach((row, index) => {
    map.set(row.entity_id, { rank: index + 1, name: row.name });
  });
  return map;
}

/**
 * Brands whose Qloo rank shifts the most between two recorded demo neighborhoods.
 * Ranks use store-brand-filtered fixture order only (no affinity percentages).
 */
export function neighborhoodRankContrast(
  left: FixtureKey,
  right: FixtureKey,
  take = 5
): LandingRankContrastRow[] {
  const leftMeta = FIXTURES[left];
  const rightMeta = FIXTURES[right];
  const leftRanks = rankMap(leftMeta.fixture);
  const rightRanks = rankMap(rightMeta.fixture);

  const candidates: Array<{
    brandName: string;
    rankA: number;
    rankB: number;
    delta: number;
    bestRank: number;
  }> = [];

  for (const [entityId, leftRow] of leftRanks) {
    const rightRow = rightRanks.get(entityId);
    if (!rightRow) continue;
    const delta = Math.abs(leftRow.rank - rightRow.rank);
    candidates.push({
      brandName: leftRow.name,
      rankA: leftRow.rank,
      rankB: rightRow.rank,
      delta,
      bestRank: Math.min(leftRow.rank, rightRow.rank),
    });
  }

  candidates.sort((a, b) => {
    if (b.delta !== a.delta) return b.delta - a.delta;
    return a.bestRank - b.bestRank;
  });

  const picked: LandingRankContrastRow[] = [];
  const used = new Set<string>();

  for (const row of candidates) {
    if (picked.length >= take) break;
    if (row.bestRank > 55) continue;
    if (used.has(row.brandName)) continue;
    used.add(row.brandName);
    picked.push({
      brandName: row.brandName,
      rankA: row.rankA,
      rankB: row.rankB,
      labelA: leftMeta.label,
      labelB: rightMeta.label,
    });
  }

  if (picked.length < take) {
    for (const row of candidates) {
      if (picked.length >= take) break;
      if (used.has(row.brandName)) continue;
      used.add(row.brandName);
      picked.push({
        brandName: row.brandName,
        rankA: row.rankA,
        rankB: row.rankB,
        labelA: leftMeta.label,
        labelB: rightMeta.label,
      });
    }
  }

  return picked;
}

/** Default landing contrast: Wicker Park vs Sevierville recorded fixtures. */
export function wickerSeviervilleRankContrast(take = 5): LandingRankContrastRow[] {
  return neighborhoodRankContrast('wicker', 'sevierville', take);
}
