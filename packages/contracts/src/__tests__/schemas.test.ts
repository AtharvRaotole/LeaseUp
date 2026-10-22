import { describe, it, expect } from 'vitest';
import {
  LocationSchema,
  BacktestResultSchema,
  AnalysisRequestSchema,
} from '../index';

describe('Contract Schemas', () => {
  describe('LocationSchema', () => {
    it('validates valid location', () => {
      const validLocation = {
        address: '123 Main St',
        latitude: 41.9088,
        longitude: -87.6776,
        city: 'Chicago',
      };

      const result = LocationSchema.safeParse(validLocation);
      expect(result.success).toBe(true);
    });

    it('rejects invalid latitude', () => {
      const invalidLocation = {
        address: '123 Main St',
        latitude: 100,
        longitude: -87.6776,
      };

      const result = LocationSchema.safeParse(invalidLocation);
      expect(result.success).toBe(false);
    });
  });

  describe('AnalysisRequestSchema', () => {
    it('validates valid request', () => {
      const validRequest = {
        address: '1574 N Milwaukee Ave, Chicago, IL',
        radius: 10,
      };

      const result = AnalysisRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.radius).toBe(10);
      }
    });

    it('applies default radius', () => {
      const request = {
        address: '123 Main St',
      };

      const result = AnalysisRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.radius).toBe(10);
      }
    });

    it('rejects address that is too short', () => {
      const invalidRequest = {
        address: 'AB',
        radius: 10,
      };

      const result = AnalysisRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('BacktestResultSchema', () => {
    it('validates valid backtest result', () => {
      const validResult = {
        totalStores: 36,
        predictedStores: 36,
        accuracy: 1.0,
        precisionAt10: 1.0,
        auc: 0.797,
        examples: [
          {
            name: 'Trader Joe\'s',
            distance: 0.8,
            rank: 1,
            predicted: true,
          },
        ],
      };

      const result = BacktestResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });
  });
});
