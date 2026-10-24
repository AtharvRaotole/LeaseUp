import { rankTopPercentFromOrder } from '@leaseup/fixtures';

/** Test helper: every "top N%" in copy must match ceil(rank/total*100). */
export function expectTopPercentsMatchRank(
  text: string,
  rank: number,
  total: number
): void {
  const expected = rankTopPercentFromOrder(rank, total);
  const matches = [...text.matchAll(/top (\d+)%/gi)];
  if (matches.length === 0) {
    throw new Error(`Expected at least one "top N%" in: ${text.slice(0, 200)}`);
  }
  for (const m of matches) {
    const stated = Number(m[1]);
    if (stated !== expected) {
      throw new Error(
        `Stated top ${stated}% but rank #${rank} of ${total} implies top ${expected}%`
      );
    }
  }
}
