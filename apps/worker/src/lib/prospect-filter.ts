export function affinityThresholdAtPercentile(
  affinities: number[],
  percentile: number
): number {
  if (affinities.length === 0) return 0.85;
  const sorted = [...affinities].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * percentile);
  return sorted[Math.min(index, sorted.length - 1)] ?? 0.85;
}

export function isProspectCandidate(
  candidate: { qlooRank: number; query?: { affinity?: number } },
  totalInsights: number,
  affinityThreshold: number
): boolean {
  const topQuarterCount = Math.max(1, Math.ceil(totalInsights * 0.25));
  const affinity = candidate.query?.affinity ?? 0;
  return candidate.qlooRank <= topQuarterCount || affinity >= affinityThreshold;
}
