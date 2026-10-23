import type { BrandRankingRow } from '@leaseup/contracts';

export function affinitiesAllIdentical(rows: BrandRankingRow[]): boolean {
  if (rows.length < 2) return false;
  const first = rows[0]!.affinity;
  return rows.every((r) => Math.abs(r.affinity - first) < 1e-9);
}

/** Shared top-percentile (1-99) from Qloo rank among brands scored for this pin. */
export function fitTopPercent(rank: number, totalScored: number): number {
  if (totalScored <= 0) return 1;
  return Math.max(1, Math.min(99, Math.round((rank / totalScored) * 100)));
}

export function fitPercentileLabel(
  rank: number,
  totalScored: number,
  tasteFitBeyondChainPercentile?: number
): string {
  if (tasteFitBeyondChainPercentile !== undefined) {
    return `Top ${tasteFitBeyondChainPercentile}% in chain tier`;
  }
  return `Top ${fitTopPercent(rank, totalScored)}%`;
}

export function fitTopPercentPhrase(
  rank: number,
  totalScored: number,
  tasteFitBeyondChainPercentile?: number
): string {
  if (tasteFitBeyondChainPercentile !== undefined) {
    return `top ${tasteFitBeyondChainPercentile}% in its chain-size tier`;
  }
  return `top ${fitTopPercent(rank, totalScored)}%`;
}
