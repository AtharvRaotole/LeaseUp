import { describe, it, expect } from 'vitest';
import {
  wickerparkFixture,
  computeStrictEval,
  buildEvalSiteSnapshot,
  getEvalManifest,
  loadLiveQlooLiftAggregates,
} from '@leaseup/fixtures';

describe('strict-eval', () => {
  it('uses same_size_auc as headline metric in manifest', () => {
    expect(getEvalManifest().headlineMetricId).toBe('same_size_auc');
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
    expect(snapshot.headlineMetricId).toBe('same_size_auc');
    const headline = snapshot.panels.find((p) => p.id === 'same_size_auc');
    expect(headline?.qloo).toBe(loadLiveQlooLiftAggregates().sameSizeAuc.value);
  });
});
