import { rankTopPercentFromOrder } from './rank-top-percent.js';

/** Only show "Top N%" when N is at most this value; otherwise show rank or lower-match wording. */
export const BROKER_TOP_PERCENT_LABEL_MAX = 25;

function rankLine(rank: number, total: number): string {
  return `#${rank} of ${total} for local taste`;
}

export function whyBrandRankSummaryLine(rank: number, total: number): string {
  if (total <= 0 || rank <= 0) return '';
  const top = rankTopPercentFromOrder(rank, total);
  if (top <= BROKER_TOP_PERCENT_LABEL_MAX) {
    return `#${rank} of ${total} brands we scored (top ${top}% for local shopper taste).`;
  }
  return `#${rank} of ${total} brands we scored for local shopper taste (lower local match).`;
}

export function tasteMatchHerePhrase(rank: number, total: number): string {
  if (total <= 0 || rank <= 0) return '';
  const top = rankTopPercentFromOrder(rank, total);
  if (top <= BROKER_TOP_PERCENT_LABEL_MAX) {
    return `Top ${top}% local match here`;
  }
  return rankLine(rank, total);
}

export function fitPercentileShortLabel(rank: number, total: number): string {
  if (total <= 0 || rank <= 0) return '';
  const top = rankTopPercentFromOrder(rank, total);
  if (top <= BROKER_TOP_PERCENT_LABEL_MAX) {
    return `Top ${top}% local match`;
  }
  return rankLine(rank, total);
}

export function leaseUpRankReasonHead(
  displayName: string,
  leaseUpRank: number,
  rankedCount: number,
  area: string
): string {
  const topPct = rankTopPercentFromOrder(leaseUpRank, rankedCount);
  if (topPct <= BROKER_TOP_PERCENT_LABEL_MAX) {
    return `${displayName}: LeaseUp rank #${leaseUpRank} (top ${topPct}% of ${rankedCount} brands) for ${area}`;
  }
  return `${displayName}: LeaseUp rank #${leaseUpRank} of ${rankedCount} brands for ${area}`;
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
    if (expected > BROKER_TOP_PERCENT_LABEL_MAX) {
      throw new Error(
        `Copy should not use top ${stated}% for rank #${rank} of ${total} (top ${expected}% is above broker label max)`
      );
    }
    if (stated !== expected) {
      throw new Error(
        `Stated top ${stated}% but rank #${rank} of ${total} implies top ${expected}%`
      );
    }
  }
}
