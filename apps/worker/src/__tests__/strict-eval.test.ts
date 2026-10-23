import { describe, it, expect } from 'vitest';
import {
  wickerparkFixture,
  computeStrictEval,
  buildEvalSiteSnapshot,
  getEvalManifest,
} from '@leaseup/fixtures';

describe('strict-eval', () => {
  it('leaves headline metric unset in manifest until live eval', () => {
    expect(getEvalManifest().headlineMetricId).toBeNull();
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
    const snapshot = buildEvalSiteSnapshot(metrics);
    expect(snapshot.panels.length).toBeGreaterThan(3);
    expect(snapshot.headlineMetricId).toBeNull();
  });
});
