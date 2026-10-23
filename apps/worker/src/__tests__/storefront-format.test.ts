import { describe, it, expect } from 'vitest';
import { formatFitsStorefront, getStorefrontFormatSpec } from '../lib/storefront-format';

const IKEA = '7E9A2E74-1CB5-43E9-8B74-69CA8283BFBD';

describe('storefront format fit', () => {
  it('tags IKEA as big-box with high minimum sq ft', () => {
    const spec = getStorefrontFormatSpec(IKEA);
    expect(spec.format).toBe('big_box');
    expect(spec.minSqFt).toBeGreaterThanOrEqual(25_000);
  });

  it('excludes IKEA for typical streetfront sizes', () => {
    expect(formatFitsStorefront(IKEA, 2_500)).toBe(false);
    expect(formatFitsStorefront(IKEA, 30_000)).toBe(true);
  });
});
