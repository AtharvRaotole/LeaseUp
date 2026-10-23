import type { BrandRankingRow } from '@leaseup/contracts';

export function affinitiesAllIdentical(rows: BrandRankingRow[]): boolean {
  if (rows.length < 2) return false;
  const first = rows[0]!.affinity;
  return rows.every((r) => Math.abs(r.affinity - first) < 1e-9);
}

/** Shared top-percentile (1-99) from Qloo rank among brands scored for this pin (lower rank is better). */
export function fitTopPercent(rank: number, totalScored: number): number {
  if (totalScored <= 0) return 1;
  return Math.max(1, Math.min(99, Math.round((rank / totalScored) * 100)));
}

/**
 * tasteFitBeyondChainPercentile is higher when taste fit is stronger within the chain-size tier
 * (see packages/fixtures tasteFitPercentileWithinTier).
 */
export function tasteFitTopBucketFromBeyondChainPercentile(percentile: number): number {
  return Math.max(1, Math.min(99, 100 - Math.round(percentile)));
}

export function tasteFitMatchHerePhrase(
  rank: number,
  totalScored: number,
  tasteFitBeyondChainPercentile?: number
): string {
  if (tasteFitBeyondChainPercentile !== undefined) {
    const top = tasteFitTopBucketFromBeyondChainPercentile(tasteFitBeyondChainPercentile);
    return `Top ${top}% for taste fit here`;
  }
  if (totalScored > 0 && rank > 0) {
    return `Top ${fitTopPercent(rank, totalScored)}% taste match here`;
  }
  return '';
}

export function fitPercentileLabel(
  rank: number,
  totalScored: number,
  tasteFitBeyondChainPercentile?: number
): string {
  if (tasteFitBeyondChainPercentile !== undefined) {
    const top = tasteFitTopBucketFromBeyondChainPercentile(tasteFitBeyondChainPercentile);
    return `Top ${top}% fit`;
  }
  return `Top ${fitTopPercent(rank, totalScored)}%`;
}

export function fitTopPercentPhrase(
  rank: number,
  totalScored: number,
  tasteFitBeyondChainPercentile?: number
): string {
  if (tasteFitBeyondChainPercentile !== undefined) {
    const top = tasteFitTopBucketFromBeyondChainPercentile(tasteFitBeyondChainPercentile);
    return `top ${top}% fit among brands we scored here`;
  }
  return `top ${fitTopPercent(rank, totalScored)}% of brands scored here`;
}
