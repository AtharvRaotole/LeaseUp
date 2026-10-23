import { describe, it, expect } from 'vitest';
import {
  wickerSeviervilleRankContrast,
  demoChipsRandomBaselineSummary,
} from '@leaseup/fixtures';
import { LANDING_PROOF_CHIPS } from '../data/landing-proof';

describe('landing marketing data', () => {
  it('rank contrast picks brands with different Wicker vs Sevierville ranks', () => {
    const rows = wickerSeviervilleRankContrast(5);
    expect(rows.length).toBe(5);
    const portillos = rows.find((r) => r.brandName === "Portillo's");
    expect(portillos).toBeDefined();
    expect(Math.abs(portillos!.rankA - portillos!.rankB)).toBeGreaterThan(40);
    for (const row of rows) {
      expect(row.rankA).not.toBe(row.rankB);
    }
  });

  it('random baseline is computed from fixture pools', () => {
    const summary = demoChipsRandomBaselineSummary();
    expect(summary.meanExpectedRandom).toBeGreaterThan(0);
    expect(summary.meanQlooTop10).toBeGreaterThanOrEqual(summary.meanExpectedRandom);
  });

  it('proof chips derive hit rates from fixtures', () => {
    expect(LANDING_PROOF_CHIPS.map((c) => c.id)).toEqual(['wicker', 'boulder', 'sevierville']);
    for (const chip of LANDING_PROOF_CHIPS) {
      expect(chip.presentInTop10).toBeGreaterThanOrEqual(0);
      expect(chip.presentInTop10).toBeLessThanOrEqual(10);
      expect(chip.hitRateLabel).toMatch(/^\d+ of 10 already nearby$/);
    }
  });
});
