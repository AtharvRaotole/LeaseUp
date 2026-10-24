import { describe, it, expect } from 'vitest';
import {
  pitchBriefKindLabel,
  pitchDateMetaLine,
  pitchExecutiveSummaryLines,
  isNearestStoreDistanceLine,
  pitchProspectFact,
  shouldShowStoredWhyLine,
} from '../lib/pitch-pack-copy';
import { DEMO_PITCH_BOULDER_ULTA_ID } from '@leaseup/contracts';
import type { PitchPackSnapshot } from '@leaseup/contracts';

describe('pitch pack copy', () => {
  it('labels demo pitches as samples with snapshot date', () => {
    const snapshot = {
      id: DEMO_PITCH_BOULDER_ULTA_ID,
      createdAt: '2026-10-24T00:00:00.000Z',
      analysisTimestamp: '2026-10-23T03:36:00.000Z',
      radiusKm: 10,
      address: '1300 Pearl St, Boulder, CO 80302',
      location: { address: '1300 Pearl St, Boulder, CO 80302', latitude: 0, longitude: 0 },
      prospects: [],
      runId: 'demo',
    } as PitchPackSnapshot;
    expect(pitchBriefKindLabel(snapshot)).toBe('Sample leasing brief');
    expect(pitchDateMetaLine(snapshot)).toMatch(/Data snapshot of Oct 23, 2026/);
    expect(pitchDateMetaLine(snapshot)).not.toMatch(/Sample pitch from/);
    expect(pitchDateMetaLine(snapshot)).not.toMatch(/^Prepared /);
  });

  it('builds executive summary from snapshot data', () => {
    const snapshot = {
      prospects: [
        { prospect: { brand: { entityId: 'a', name: 'Nike', affinity: 1, affinityRank: 1, verified: 'verified (2 sources)' }, outreachDraft: '', reasons: [] }, whyLine: '' },
        { prospect: { brand: { entityId: 'b', name: 'Vans', affinity: 1, affinityRank: 2, verified: 'verified (2 sources)' }, outreachDraft: '', reasons: [] }, whyLine: '' },
      ],
      radiusKm: 10,
      osmSnapshotLabel: 'OpenStreetMap',
    } as Pick<PitchPackSnapshot, 'prospects' | 'radiusKm' | 'osmSnapshotLabel'>;
    const lines = pitchExecutiveSummaryLines(snapshot as PitchPackSnapshot);
    expect(lines[0]).toContain('2 brands');
    expect(lines[1]).toContain('Nike');
  });

  it('uses nearest store fact within trade radius', () => {
    const fact = pitchProspectFact(
      {
        brand: { entityId: 'x', name: 'Test', affinity: 1, affinityRank: 1, verified: 'verified (2 sources)' },
        outreachDraft: '',
        reasons: [],
        nearestExistingStoreKm: 4.2,
      },
      10
    );
    expect(fact).toBe('Nearest Test is 4.2 km from this pin.');
  });

  it('uses report radius for far nearest store, not a 25 km default', () => {
    const fact = pitchProspectFact(
      {
        brand: { entityId: 'ikea', name: 'IKEA', affinity: 1, affinityRank: 3, verified: 'verified (2 sources)' },
        outreachDraft: '',
        reasons: [],
        nearestExistingStoreKm: 33.8,
      },
      10
    );
    expect(fact).toContain('33.8 km');
    expect(fact).toContain('no store within 10 km');
    expect(fact).not.toContain('25 km');
  });

  it('hides rank-only and duplicate nearest-store why lines', () => {
    expect(shouldShowStoredWhyLine('Qloo rank #8 (top 5%) in Pearl Street')).toBe(false);
    expect(
      shouldShowStoredWhyLine('Ulta: LeaseUp rank #26 (top 12% of 224 brands) for Pearl Street')
    ).toBe(false);
    expect(shouldShowStoredWhyLine('Nearest IKEA is 33.8 km from this pin.')).toBe(false);
    expect(isNearestStoreDistanceLine('Nearest IKEA is 33.8 km from this pin.')).toBe(true);
    expect(shouldShowStoredWhyLine('Strong co-tenancy with local apparel')).toBe(true);
  });
});
