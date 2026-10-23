import { describe, it, expect } from 'vitest';
import { wickerLandingTasteSnippet } from '@leaseup/fixtures';
import { LANDING_PROOF_CHIPS } from '../data/landing-proof';

describe('landing marketing data', () => {
  it('wicker taste snippet uses recorded brand names and affinities', () => {
    const rows = wickerLandingTasteSnippet();
    expect(rows).toHaveLength(3);
    expect(rows[0]?.brandName).toBe('Whole Foods Market');
    expect(rows[0]?.affinity).toBeGreaterThan(0.99);
  });

  it('proof chips derive hit rates from fixtures', () => {
    expect(LANDING_PROOF_CHIPS.map((c) => c.id)).toEqual(['wicker', 'boulder', 'sevierville']);
    for (const chip of LANDING_PROOF_CHIPS) {
      expect(chip.presentInTop10).toBeGreaterThanOrEqual(0);
      expect(chip.presentInTop10).toBeLessThanOrEqual(10);
      expect(chip.hitRateLabel).toMatch(/^Hit rate \d+ of 10$/);
    }
  });
});
