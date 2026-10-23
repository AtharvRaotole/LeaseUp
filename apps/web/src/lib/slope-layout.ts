export function resolveLabelYs(
  naturalYs: number[],
  minY: number,
  maxY: number,
  minGap = 16
): number[] {
  if (naturalYs.length === 0) return [];
  const order = naturalYs.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const placed = order.map((o) => o.y);

  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < placed.length; i++) {
      if (placed[i]! < placed[i - 1]! + minGap) placed[i] = placed[i - 1]! + minGap;
    }
    if (placed[placed.length - 1]! > maxY) {
      placed[placed.length - 1] = maxY;
      for (let i = placed.length - 2; i >= 0; i--) {
        if (placed[i]! > placed[i + 1]! - minGap) placed[i] = placed[i + 1]! - minGap;
      }
    }
    if (placed[0]! < minY) {
      placed[0] = minY;
      for (let i = 1; i < placed.length; i++) {
        if (placed[i]! < placed[i - 1]! + minGap) placed[i] = placed[i - 1]! + minGap;
      }
    }
  }

  const out = new Array<number>(naturalYs.length);
  order.forEach((o, idx) => {
    out[o.i] = placed[idx]!;
  });
  return out;
}
