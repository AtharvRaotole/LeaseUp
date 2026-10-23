import { getNationalStoreCount, getStoreBrandIdSet } from './store-geo.js';

/**
 * @deprecated Ranking uses logistic blend (see logistic-blend.ts). Kept for backward-compatible API fields.
 */
export const CHAIN_PRIOR_BLEND_WEIGHT = 0.25;

export interface RankedInsight {
  entity_id: string;
  name: string;
  query?: { affinity?: number; affinity_rank?: number; popularity?: number };
  qlooRank: number;
  blendedRank: number;
}

/**
 * Blend raw Qloo order with a national chain-size prior (ATP store counts).
 * Returns a new list sorted by blended score; `qlooRank` preserves the original Qloo order.
 */
/**
 * Naive baseline: same Qloo candidate pool, ordered by national ATP store count (largest chains first).
 */
export function orderInsightsByNationalStoreCount<
  T extends { entity_id: string; name: string },
>(insights: T[]): T[] {
  const ids = getStoreBrandIdSet();
  const pool = insights.filter((i) => ids.has(i.entity_id));
  return [...pool].sort(
    (a, b) => getNationalStoreCount(b.entity_id) - getNationalStoreCount(a.entity_id)
  );
}

/** @deprecated Use orderInsightsByLogisticBlend from logistic-blend.ts for prospect ordering. */
export function blendWithNationalPrior<T extends { entity_id: string; name: string; query?: { affinity?: number } }>(
  insights: T[]
): Array<T & { qlooRank: number; blendedRank: number }> {
  const n = insights.length;
  if (n === 0) return [];

  const maxNational = Math.max(
    ...insights.map((i) => getNationalStoreCount(i.entity_id)),
    1
  );

  const scored = insights.map((insight, index) => {
    const qlooScore = n <= 1 ? 1 : 1 - index / (n - 1);
    const nationalScore = getNationalStoreCount(insight.entity_id) / maxNational;
    const blendedScore =
      (1 - CHAIN_PRIOR_BLEND_WEIGHT) * qlooScore + CHAIN_PRIOR_BLEND_WEIGHT * nationalScore;

    return {
      ...insight,
      qlooRank: index + 1,
      blendedScore,
    };
  });

  scored.sort((a, b) => b.blendedScore - a.blendedScore);

  return scored.map((row, index) => ({
    ...row,
    blendedRank: index + 1,
  }));
}
