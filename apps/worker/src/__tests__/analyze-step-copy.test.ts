import { describe, it, expect } from 'vitest';
import { tasteLocationLabel, formatBacktestStepSummary } from '../lib/analyze-step-copy';

describe('tasteLocationLabel', () => {
  it('prefers neighborhood over coordinates for point Qloo locations', () => {
    const label = tasteLocationLabel(
      {
        address: '1560 N Milwaukee Ave, Chicago, IL',
        latitude: 41.9099418,
        longitude: -87.6772824,
        city: 'Chicago',
        neighborhood: 'Wicker Park',
        resolvedAddress: '1560 N Milwaukee Ave, Wicker Park, Chicago, IL',
      },
      { kind: 'point', latitude: 41.9099418, longitude: -87.6772824, radiusKm: 10 }
    );
    expect(label).toBe('Wicker Park');
  });
});

describe('formatBacktestStepSummary', () => {
  it('includes adaptive radius and random baseline', () => {
    const { summary } = formatBacktestStepSummary({
      adaptiveRadiusKm: 1.5,
      raw: { totalStores: 0, predictedStores: 0, accuracy: 0.3, precisionAt10: 0.3, presentInTop10: 3, examples: [] },
      blended: {
        totalStores: 0,
        predictedStores: 0,
        accuracy: 0.9,
        precisionAt10: 0.9,
        presentInTop10: 9,
        examples: [],
      },
      randomExpectedPresentAt10: 4.2,
    });
    expect(summary).toContain('Adaptive 1.5 km');
    expect(summary).toContain('raw 3/10');
    expect(summary).toContain('blend 9/10');
    expect(summary).toContain('random ~4.2/10');
  });
});
