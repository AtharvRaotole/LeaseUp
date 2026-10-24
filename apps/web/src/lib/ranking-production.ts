import type { AnalysisResponse, BacktestResult, BrandRankingRow } from '@leaseup/contracts';

/** LeaseUp production list order (logistic taste + chain size blend), not raw Qloo order. */
export function leaseUpProductionRank(row: BrandRankingRow): number {
  return row.blendedRank;
}

export function displayRankForMode(
  row: BrandRankingRow,
  mode: 'qloo' | 'baseline'
): number {
  if (mode === 'baseline') {
    return row.baselineRank ?? row.blendedRank;
  }
  return leaseUpProductionRank(row);
}

export function sortRankingsForMode(
  rankings: BrandRankingRow[],
  mode: 'qloo' | 'baseline'
): BrandRankingRow[] {
  return [...rankings].sort(
    (a, b) => displayRankForMode(a, mode) - displayRankForMode(b, mode)
  );
}

export function activeBacktestForRankingMode(
  results: AnalysisResponse,
  mode: 'qloo' | 'baseline'
): BacktestResult {
  if (mode === 'baseline' && results.backtestBaseline) {
    return results.backtestBaseline;
  }
  return results.backtestBlended ?? results.backtest;
}
