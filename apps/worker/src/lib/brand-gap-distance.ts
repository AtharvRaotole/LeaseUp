/** Minimum gap (km) before we treat a high-affinity cell as a white-space opportunity. */
export function minGapKmForBrand(nationalStoreCount: number): number {
  if (nationalStoreCount <= 0) return 3;
  const density = Math.sqrt(Math.max(1, nationalStoreCount));
  const km = 45 / density;
  return Math.min(8, Math.max(1.2, km));
}
