import { describe, it, expect } from 'vitest';
import {
  getLogisticBlendCoefficients,
  orderInsightsByLogisticBlend,
} from '@leaseup/fixtures/worker';
import { blendWithNationalPrior, CHAIN_PRIOR_BLEND_WEIGHT } from '@leaseup/fixtures';
const sample = [
  { entity_id: 'A', name: 'A', query: { affinity: 0.9 } },
  { entity_id: 'B', name: 'B', query: { affinity: 0.4 } },
  { entity_id: 'C', name: 'C', query: { affinity: 0.7 } },
  { entity_id: 'D', name: 'D', query: { affinity: 0.2 } },
];

describe('production ranking prior (40-address eval coefficients)', () => {
  it('uses pooled M1 logistic coefficients, not legacy 0.75/0.25 blend', () => {
    const shipped = getLogisticBlendCoefficients();
    expect(shipped.model).toBe('M1_pooled');
    expect(shipped.fittedOn).toContain('40-site');
    expect(shipped.features).toContain('qlooAffinityZ');
    expect(shipped.features).not.toContain('legacyBlend075');
    expect(CHAIN_PRIOR_BLEND_WEIGHT).toBe(0.25);

    const logisticOrder = orderInsightsByLogisticBlend(sample, 'urban').map((r) => r.entity_id);
    const legacyOrder = blendWithNationalPrior(sample).map((r) => r.entity_id);
    expect(logisticOrder).not.toEqual(legacyOrder);
  });
});
