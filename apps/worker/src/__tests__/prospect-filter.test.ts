import { describe, it, expect } from 'vitest';
import { affinityThresholdAtPercentile, isProspectCandidate } from '../lib/prospect-filter';

describe('prospect filter', () => {
  it('uses top quartile by Qloo rank when affinity_rank is missing', () => {
    const total = 40;
    const threshold = affinityThresholdAtPercentile([0.5, 0.7, 0.9, 0.95], 0.75);

    expect(isProspectCandidate({ qlooRank: 8, query: { affinity: 0.6 } }, total, threshold)).toBe(
      true
    );
    expect(isProspectCandidate({ qlooRank: 30, query: { affinity: 0.6 } }, total, threshold)).toBe(
      false
    );
  });

  it('allows high-affinity brands outside top quartile', () => {
    const total = 40;
    const threshold = 0.9;

    expect(isProspectCandidate({ qlooRank: 25, query: { affinity: 0.95 } }, total, threshold)).toBe(
      true
    );
  });
});
