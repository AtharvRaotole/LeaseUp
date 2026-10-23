export function affinityPercentile(affinityRank: number): number {
  if (affinityRank <= 1 && affinityRank > 0) {
    return Math.round(affinityRank * 100);
  }
  return Math.max(0, Math.min(100, Math.round(affinityRank)));
}
