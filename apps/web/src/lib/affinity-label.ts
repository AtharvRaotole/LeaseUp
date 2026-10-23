/** Qloo heatmap affinity_rank is a 0 to 1 score (higher = stronger local taste). */
export function affinityPercentile(affinityRank: number): number {
  if (affinityRank <= 1 && affinityRank > 0) {
    return Math.round(affinityRank * 100);
  }
  return Math.max(0, Math.min(100, Math.round(affinityRank)));
}

/** Human label e.g. "Top 1% match" (never raw floats). */
export function formatAffinityMatchLabel(affinityRank: number): string {
  const pct = affinityPercentile(affinityRank);
  const topBucket = Math.max(1, Math.min(50, 100 - pct));
  if (topBucket <= 1) return 'Top 1% match';
  if (topBucket <= 5) return 'Top 5% match';
  if (topBucket <= 10) return 'Top 10% match';
  return `Top ${topBucket}% match`;
}
