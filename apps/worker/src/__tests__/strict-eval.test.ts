import { describe, it, expect } from 'vitest';
import { wickerparkFixture, computeStrictEval, STRICT_EVAL_PRIMARY_METRIC_ID } from '@leaseup/fixtures';

describe('strict-eval', () => {
  it('uses spearman as the pre-declared primary metric id', () => {
    expect(STRICT_EVAL_PRIMARY_METRIC_ID).toBe('spearman_presence');
  });

  it('scores wicker with saturated legacy P@10', () => {
    const { latitude, longitude } = wickerparkFixture.location;
    const metrics = computeStrictEval(
      wickerparkFixture.insights,
      latitude,
      longitude,
      10,
      'urban'
    );
    expect(metrics.legacyPresentAt10Qloo).toBe(10);
    expect(metrics.legacyPresentAt10Chain).toBe(10);
    expect(metrics.adaptiveRadiusKm).toBe(3);
  });
});
