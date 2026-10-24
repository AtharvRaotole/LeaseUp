import type { BrandRankingRow } from '@leaseup/contracts';
import { rankTopPercentFromOrder } from '@leaseup/fixtures';

export function affinitiesAllIdentical(rows: BrandRankingRow[]): boolean {
  if (rows.length < 2) return false;
  const first = rows[0]!.affinity;
  return rows.every((r) => Math.abs(r.affinity - first) < 1e-9);
}

/** Top X% among brands scored at this pin (rank 1 is best). */
export function fitTopPercent(rank: number, totalScored: number): number {
  return rankTopPercentFromOrder(rank, totalScored);
}

export function tasteFitMatchHerePhrase(rank: number, totalScored: number): string {
  if (totalScored > 0 && rank > 0) {
    return `Top ${fitTopPercent(rank, totalScored)}% local match here`;
  }
  return '';
}

export function fitPercentileLabel(rank: number, totalScored: number): string {
  if (totalScored <= 0 || rank <= 0) return '';
  return `Top ${fitTopPercent(rank, totalScored)}% local match`;
}

export function fitTopPercentPhrase(rank: number, totalScored: number): string {
  if (totalScored <= 0 || rank <= 0) return '';
  return `top ${fitTopPercent(rank, totalScored)}% of brands scored here`;
}

/** @deprecated tier percentile is not shown in broker copy; use fitTopPercent(rank, total). */
export function tasteFitTopBucketFromBeyondChainPercentile(percentile: number): number {
  return Math.max(1, Math.min(99, 100 - Math.round(percentile)));
}
