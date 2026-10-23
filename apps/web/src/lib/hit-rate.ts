import type { BacktestResult } from '@leaseup/contracts';

export function presentInTop10Count(backtest: BacktestResult): number {
  if (backtest.presentInTop10 !== undefined) return backtest.presentInTop10;
  return Math.round(backtest.precisionAt10 * 10);
}

export function hitRateStatLabel(backtest: BacktestResult): string {
  return `${presentInTop10Count(backtest)} of 10`;
}
