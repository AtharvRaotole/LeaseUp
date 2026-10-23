import type { BacktestResult, BrandRankingRow } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { presentInTop10Count } from './hit-rate';

export function qlooProofSentence(
  qlooBacktest: BacktestResult,
  baselineBacktest: BacktestResult
): string {
  const withoutTaste = presentInTop10Count(baselineBacktest);
  const withQloo = presentInTop10Count(qlooBacktest);
  return `Without taste data: ${withoutTaste} of 10. With Qloo: ${withQloo} of 10.`;
}

export function qlooProofWinner(
  qlooBacktest: BacktestResult,
  baselineBacktest: BacktestResult
): 'qloo' | 'baseline' | 'tie' {
  const q = presentInTop10Count(qlooBacktest);
  const b = presentInTop10Count(baselineBacktest);
  if (q > b) return 'qloo';
  if (b > q) return 'baseline';
  return 'tie';
}

export function rankMovementLabel(qlooRank: number, baselineRank: number): string {
  const delta = baselineRank - qlooRank;
  if (delta > 0) return `Up ${delta} with Qloo`;
  if (delta < 0) return `Down ${Math.abs(delta)} with Qloo`;
  return 'Same rank';
}

function topRankMovers(rankings: BrandRankingRow[], take = 3): BrandRankingRow[] {
  return rankings
    .filter(
      (row) =>
        row.baselineRank !== undefined &&
        row.qlooRank !== row.baselineRank &&
        (row.qlooRank <= 10 || row.baselineRank <= 10)
    )
    .sort((a, b) => {
      const deltaA = Math.abs((a.baselineRank ?? a.qlooRank) - a.qlooRank);
      const deltaB = Math.abs((b.baselineRank ?? b.qlooRank) - b.qlooRank);
      if (deltaB !== deltaA) return deltaB - deltaA;
      return Math.min(a.qlooRank, a.baselineRank ?? a.qlooRank) -
        Math.min(b.qlooRank, b.baselineRank ?? b.qlooRank);
    })
    .slice(0, take);
}

/** When hit counts tie, explain which top-10 rows moved between taste and chain-size order. */
export function qlooProofTieDetail(rankings: BrandRankingRow[] | undefined): string | null {
  if (!rankings?.length) return null;
  const movers = topRankMovers(rankings, 3);
  if (movers.length === 0) {
    return 'Same hit count and the top 10 brand list matches chain-size order.';
  }
  const parts = movers.map((row) => {
    const name = displayBrandName(row.entityId, row.name);
    return `${name} (#${row.qlooRank} taste vs #${row.baselineRank ?? row.qlooRank} chain size)`;
  });
  return `Same hit count; Qloo reshuffles who makes the top 10 (e.g. ${parts.join('; ')}).`;
}
