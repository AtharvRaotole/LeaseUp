export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0]!;
  const clamped = Math.min(1, Math.max(0, p));
  const idx = (sortedAsc.length - 1) * clamped;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo]!;
  const w = idx - lo;
  return sortedAsc[lo]! * (1 - w) + sortedAsc[hi]! * w;
}

/** Map values into [0,1] using lower/upper percentiles (values outside are clamped). */
export function normalizeByPercentileRange(
  values: number[],
  lowP: number,
  highP: number
): number[] {
  const positive = values.filter((v) => v > 0);
  if (positive.length === 0) {
    return values.map(() => 0);
  }
  const sorted = [...positive].sort((a, b) => a - b);
  const lo = percentile(sorted, lowP);
  const hi = percentile(sorted, highP);
  const span = hi - lo;
  return values.map((v) => {
    if (v <= 0) return 0;
    if (span <= 1e-9) return 1;
    return Math.min(1, Math.max(0, (v - lo) / span));
  });
}
