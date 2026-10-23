import { describe, it, expect } from 'vitest';
import { resolveLabelYs } from '../lib/slope-layout';

describe('resolveLabelYs', () => {
  it('separates piled labels for wide rank spreads', () => {
    const ranks = [3, 20, 45, 103, 120, 180, 195, 200];
    const minY = 80;
    const maxY = 320;
    const inner = 240;
    const natural = ranks.map((r) => minY + ((r - 1) / 199) * inner);
    const placed = resolveLabelYs(natural, minY, maxY, 18);
    const sorted = [...placed].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(18);
    }
    expect(placed[0]).toBeGreaterThanOrEqual(minY);
    expect(placed[placed.length - 1]).toBeLessThanOrEqual(maxY);
  });
});
