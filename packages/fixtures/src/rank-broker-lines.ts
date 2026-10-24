import { rankTopPercentFromOrder } from './rank-top-percent.js';

export function whyBrandRankSummaryLine(rank: number, total: number): string {
  const top = rankTopPercentFromOrder(rank, total);
  return `#${rank} of ${total} brands we scored (top ${top}% for local shopper taste).`;
}

export function tasteMatchHerePhrase(rank: number, total: number): string {
  if (total <= 0 || rank <= 0) return '';
  return `Top ${rankTopPercentFromOrder(rank, total)}% local match here`;
}

export function fitPercentileShortLabel(rank: number, total: number): string {
  if (total <= 0 || rank <= 0) return '';
  return `Top ${rankTopPercentFromOrder(rank, total)}% local match`;
}

export function leaseUpRankReasonHead(
  displayName: string,
  leaseUpRank: number,
  rankedCount: number,
  area: string
): string {
  const topPct = rankTopPercentFromOrder(leaseUpRank, rankedCount);
  return `${displayName}: LeaseUp rank #${leaseUpRank} (top ${topPct}% of ${rankedCount} brands) for ${area}`;
}

export function brandRankSurfaceStrings(
  rank: number,
  total: number,
  reasonHead?: string
): string[] {
  const lines = [
    whyBrandRankSummaryLine(rank, total),
    tasteMatchHerePhrase(rank, total),
    fitPercentileShortLabel(rank, total),
  ];
  if (reasonHead?.includes('LeaseUp rank #')) {
    lines.push(reasonHead);
  }
  return lines;
}

export function assertTopPercentCopyMatchesRank(text: string, rank: number, total: number): void {
  const expected = rankTopPercentFromOrder(rank, total);
  const matches = [...text.matchAll(/top (\d+)%/gi)];
  for (const m of matches) {
    const stated = Number(m[1]);
    if (stated !== expected) {
      throw new Error(
        `Stated top ${stated}% but rank #${rank} of ${total} implies top ${expected}%`
      );
    }
  }
}
