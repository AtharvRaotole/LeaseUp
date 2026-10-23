import { describe, expect, it } from 'vitest';
import { cohortLogisticBlendMeanP10 } from '../eval/logistic-blend-cohort.js';
import { getLogisticBlendCoefficients } from '../logistic-blend.js';

describe('logistic blend cohort (data/qloo-eval-40)', () => {
  it('reproduces mean P@10 near 0.82 with fitted pooled M1 coefficients', () => {
    const coef = getLogisticBlendCoefficients();
    expect(coef.version).toBe(2);
    const meanP10 = cohortLogisticBlendMeanP10();
    expect(meanP10).toBeGreaterThan(0.79);
    expect(meanP10).toBeLessThan(0.85);
    expect(coef.cohortMeanP10PooledRank).toBeCloseTo(0.82, 2);
  });
});
