import type { BacktestResult, BrandRankingRow } from '@leaseup/contracts';
import { loadLiveQlooLiftAggregates } from '@leaseup/fixtures';
import { displayBrandName } from './brand-display';
import { presentInTop10Count } from './hit-rate';

/** Cohort-level eval copy (never claim raw Qloo beats chain size). */
export function qlooEvalHeadlineParts(): {
  headline: string;
  companion: string;
  caveat: string;
} {
  const agg = loadLiveQlooLiftAggregates();
  const auc = agg.sameSizeAuc;
  const headline =
    `Among brands with a similar national footprint, Qloo ranks chains that already operate here ahead of absent ones about two-thirds of the time ` +
    `(same-size AUC ${auc.value.toFixed(2)}, 95% CI ${auc.ciLow.toFixed(2)} to ${auc.ciHigh.toFixed(2)}).`;
  const blendPct = (agg.logisticBlendPrecisionAt10 * 100).toFixed(0);
  const chainPct = (agg.chainSizePrecisionAt10 * 100).toFixed(0);
  const companion =
    `The logistic companion blend reaches ${blendPct}% top-10 precision vs ${chainPct}% for chain size alone on our recorded sites.`;
  const caveat =
    'Qloo taste may partly reflect brands that already operate in the trade area; read lift alongside store absence checks.';
  return { headline, companion, caveat };
}

export function qlooEvalHeadlineCopy(): string {
  const { headline, companion, caveat } = qlooEvalHeadlineParts();
  return `${headline} ${companion} ${caveat}`;
}

export function qlooProofSentence(
  qlooBacktest: BacktestResult,
  baselineBacktest: BacktestResult
): string {
  const withoutTaste = presentInTop10Count(baselineBacktest);
  const withTaste = presentInTop10Count(qlooBacktest);
  return `Local taste ranking: ${withTaste} of 10 top picks already have a store nearby. Ranking by chain size only: ${withoutTaste} of 10.`;
}

export function qlooProofSentenceTechnical(
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
  if (delta > 0) return `+${delta} with taste`;
  if (delta < 0) return `${delta} with taste`;
  return 'Same';
}

export function rankMovementLabelTechnical(qlooRank: number, baselineRank: number): string {
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

export function qlooProofTieDetail(rankings: BrandRankingRow[] | undefined): string | null {
  if (!rankings?.length) return null;
  const movers = topRankMovers(rankings, 3);
  if (movers.length === 0) {
    return 'Same nearby-store count and the top 10 list matches chain-size order.';
  }
  const parts = movers.map((row) => {
    const name = displayBrandName(row.entityId, row.name);
    return `${name} (taste #${row.qlooRank} vs chain size #${row.baselineRank ?? row.qlooRank})`;
  });
  return `Same nearby-store count, but taste changes who makes the top 10 (e.g. ${parts.join('; ')}).`;
}

export function qlooProofTieDetailTechnical(rankings: BrandRankingRow[] | undefined): string | null {
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

export function qlooProofHitRateTieSubtitle(
  rankings: BrandRankingRow[] | undefined
): string | null {
  const detail = qlooProofTieDetail(rankings);
  if (!detail) return 'Tied on nearby-store match; taste still changes order.';
  return detail;
}
