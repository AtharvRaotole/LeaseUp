import { describe, it, expect } from 'vitest';
import type { AnalysisResponse } from '@leaseup/contracts';
import { pitchShareMeta, reportShareMeta } from '../lib/share-preview';

function minimalResults(): AnalysisResponse {
  return {
    location: {
      address: '1574 N Milwaukee Ave, Chicago, IL',
      latitude: 41.91,
      longitude: -87.68,
      neighborhood: 'Wicker Park',
      city: 'Chicago',
    },
    timestamp: '2026-10-23T00:00:00.000Z',
    runId: 'run-1',
    mode: 'demo',
    prospects: [
      {
        brand: {
          entityId: 'a',
          name: 'Starbucks',
          affinity: 0.99,
          affinityRank: 2,
          verified: 'unverified (1 source)',
        },
        outreachDraft: 'Hi',
        reasons: ['High taste fit'],
        nearestExistingStoreKm: 12,
      },
    ],
    rankings: [],
    backtest: {
      totalStores: 10,
      predictedStores: 5,
      accuracy: 0.5,
      precisionAt10: 0.5,
      examples: [],
    },
    dataQuality: 'high',
    warnings: [],
  };
}

describe('share-preview meta', () => {
  it('builds report title with neighborhood and worker OG image URL', () => {
    const meta = reportShareMeta(minimalResults(), 10, '/r/wicker?address=x&radius=10');
    expect(meta.title).toContain('Wicker Park');
    expect(meta.title).toContain('LeaseUp');
    expect(meta.description).toMatch(/#2 Starbucks|Starbucks/);
    expect(meta.imageUrl).toMatch(
      /^https:\/\/leaseup-worker\.issue-atharva\.workers\.dev\/api\/og\/report\.png\?/
    );
    expect(meta.canonicalUrl).toContain('leaseup-59m.pages.dev');
  });

  it('builds pitch pack meta with pitch OG path', () => {
    const meta = pitchShareMeta(
      {
        id: 'pitch-abc',
        createdAt: '2026-10-23T00:00:00.000Z',
        address: '1 Main St',
        neighborhood: 'NoHo',
        location: minimalResults().location,
        radiusKm: 10,
        analysisTimestamp: '2026-10-23T00:00:00.000Z',
        runId: 'r',
        mode: 'demo',
        prospects: [
          {
            prospect: minimalResults().prospects[0]!,
            whyLine: 'No store nearby',
          },
        ],
      },
      '/p/pitch-abc'
    );
    expect(meta.title).toContain('Pitch pack');
    expect(meta.imageUrl).toContain('/api/og/pitch/pitch-abc.png');
  });
});
