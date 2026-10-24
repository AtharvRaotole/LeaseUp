import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

/** Re-order pitch prospects when the broker flips taste vs chain-size ranking. */
export function orderProspectsForRankingMode(
  results: AnalysisResponse,
  mode: 'qloo' | 'baseline'
): ProspectPack[] {
  if (mode === 'qloo' || !results.rankings?.length) {
    return results.prospects;
  }
  const rankByEntity = new Map(
    results.rankings.map((row) => [row.entityId, row.baselineRank ?? row.blendedRank])
  );
  return [...results.prospects].sort((a, b) => {
    const rankA = rankByEntity.get(a.brand.entityId) ?? Number.POSITIVE_INFINITY;
    const rankB = rankByEntity.get(b.brand.entityId) ?? Number.POSITIVE_INFINITY;
    return rankA - rankB;
  });
}
