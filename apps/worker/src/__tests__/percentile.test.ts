import { describe, it, expect } from 'vitest';
import { normalizeByPercentileRange, percentile } from '../lib/percentile';

describe('percentile', () => {
  it('interpolates between sorted values', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });

  it('normalizes by 50th–99th range', () => {
    const values = [0.1, 0.2, 0.5, 0.8, 0.9, 1.0];
    const normed = normalizeByPercentileRange(values, 0.5, 0.99);
    expect(normed[2]).toBeCloseTo(0, 1);
    expect(normed[normed.length - 1]).toBeCloseTo(1, 1);
  });
});
