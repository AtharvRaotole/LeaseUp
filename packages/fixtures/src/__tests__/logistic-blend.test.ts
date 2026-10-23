import { describe, expect, it } from 'vitest';
import { orderInsightsByLogisticBlend } from '../logistic-blend.js';
import { wickerparkFixture } from '../wicker-park.js';

describe('orderInsightsByLogisticBlend', () => {
  it('preserves qloo ranks and assigns blended ranks', () => {
    const sample = wickerparkFixture.insights.slice(0, 12);
    const ordered = orderInsightsByLogisticBlend(sample, 'urban');
    expect(ordered).toHaveLength(sample.length);
    sample.forEach((row, index) => {
      const found = ordered.find((r) => r.entity_id === row.entity_id);
      expect(found?.qlooRank).toBe(index + 1);
    });
    expect(new Set(ordered.map((r) => r.blendedRank)).size).toBe(sample.length);
  });
});
