import type { BrandRankingRow } from '@leaseup/contracts';

export function affinitiesAllIdentical(rows: BrandRankingRow[]): boolean {
  if (rows.length < 2) return false;
  const first = rows[0]!.affinity;
  return rows.every((r) => Math.abs(r.affinity - first) < 1e-9);
}

/** Top X% fit by Qloo rank among brands scored for this pin (lower rank = stronger). */
export function fitPercentileLabel(qlooRank: number, totalScored: number): string {
  if (totalScored <= 0) return 'Top fit';
  const pct = Math.max(1, Math.min(99, Math.round((qlooRank / totalScored) * 100)));
  return `Top ${pct}%`;
}

export function fitPercentileFromRank(rank: number, total: number): number {
  if (total <= 1) return 1;
  return Math.max(1, Math.min(99, Math.round(((rank - 1) / (total - 1)) * 100)));
}
