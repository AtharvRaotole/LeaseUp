import type { BacktestResult } from '@leaseup/contracts';
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
