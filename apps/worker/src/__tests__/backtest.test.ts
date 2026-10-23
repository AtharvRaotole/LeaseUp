import { describe, it, expect } from 'vitest';
import {
  calculateAUC,
  computeBacktest,
  filterInsightsToStoreBrands,
  getStoreBrandIds,
  wickerparkFixture,
  boulderFixture,
  seviervilleFixture,
} from '@leaseup/fixtures';

describe('Backtest calculations', () => {
  describe('calculateAUC', () => {
    it('returns 1.0 when all present brands rank higher than absent', () => {
      const insights = [
        { entity_id: 'present1', name: 'Present 1' },
        { entity_id: 'present2', name: 'Present 2' },
        { entity_id: 'absent1', name: 'Absent 1' },
        { entity_id: 'absent2', name: 'Absent 2' },
      ];
      const presentBrands = new Set(['present1', 'present2']);

      expect(calculateAUC(insights, presentBrands)).toBe(1.0);
    });

    it('returns 0.0 when all absent brands rank higher than present', () => {
      const insights = [
        { entity_id: 'absent1', name: 'Absent 1' },
        { entity_id: 'absent2', name: 'Absent 2' },
        { entity_id: 'present1', name: 'Present 1' },
        { entity_id: 'present2', name: 'Present 2' },
      ];
      const presentBrands = new Set(['present1', 'present2']);

      expect(calculateAUC(insights, presentBrands)).toBe(0.0);
    });
  });

  describe('computeBacktest', () => {
    it('only scores brands in the ATP store dataset', () => {
      const insights = [
        { entity_id: 'not-in-dataset', name: 'Fake Brand' },
        ...wickerparkFixture.insights.slice(0, 5).map((i) => ({
          entity_id: i.entity_id,
          name: i.name,
        })),
      ];

      const filtered = filterInsightsToStoreBrands(insights);
      expect(filtered.every((row) => getStoreBrandIds().includes(row.entity_id))).toBe(true);
      expect(filtered.length).toBe(5);
    });

    it('matches fixture backtest headers for demo neighborhoods', () => {
      const cases = [
        { fixture: wickerparkFixture, label: 'wicker' },
        { fixture: boulderFixture, label: 'boulder' },
        { fixture: seviervilleFixture, label: 'sevierville' },
      ];

      for (const { fixture, label } of cases) {
        const result = computeBacktest(
          fixture.insights,
          fixture.location.latitude,
          fixture.location.longitude,
          fixture.backtest.radius_km
        );
        expect(result.precisionAt10).toBeCloseTo(fixture.backtest.precisionAt10, 5);
        expect(result.auc).toBeCloseTo(fixture.backtest.auc, 5);
        expect(result.presentInTop10).toBeLessThanOrEqual(10);
        expect(label).toBeTruthy();
      }
    });
  });
});
