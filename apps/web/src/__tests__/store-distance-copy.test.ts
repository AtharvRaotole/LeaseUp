import { describe, it, expect } from 'vitest';
import { nearestStoreDistanceAttribution, pitchFreshnessHonestyLine } from '../lib/store-distance-copy';
import { pitchNearestStoreBriefLine } from '../lib/pitch-pack-copy';
import type { PitchPackSnapshot, ProspectPack } from '@leaseup/contracts';

describe('store distance copy', () => {
  it('labels snapshot-only distances with the snapshot date', () => {
    expect(
      nearestStoreDistanceAttribution(true, '2026-10-20T00:00:00.000Z')
    ).toContain('snapshot');
  });

  it('states refreshed distances when reconcile ran on read', () => {
    const now = new Date('2026-10-24T15:00:00.000Z');
    const line = pitchFreshnessHonestyLine(
      {
        createdAt: '2026-10-20T00:00:00.000Z',
        analysisTimestamp: '2026-10-20T00:00:00.000Z',
        storeDistanceDataAsOf: '2026-10-24T12:00:00.000Z',
        storeDistancesSnapshotOnly: false,
      } as PitchPackSnapshot,
      now
    );
    expect(line).toBe('Saved Oct 20, 2026. Store distances refreshed today.');
  });

  it('states snapshot-only distances with snapshot date', () => {
    const line = pitchFreshnessHonestyLine({
      createdAt: '2026-10-20T00:00:00.000Z',
      analysisTimestamp: '2026-10-20T00:00:00.000Z',
      storeDistanceDataAsOf: '2026-10-20T00:00:00.000Z',
      storeDistancesSnapshotOnly: true,
    } as PitchPackSnapshot);
    expect(line).toBe('Saved Oct 20, 2026. Store distances from snapshot Oct 20, 2026.');
  });

  it('pitch brief uses snapshot label when serve meta says snapshot only', () => {
    const prospect: ProspectPack = {
      brand: {
        entityId: 'x',
        name: 'Aerie',
        affinity: 1,
        affinityRank: 1,
        verified: 'verified (2 sources)',
      },
      outreachDraft: '',
      reasons: [],
      nearestExistingStoreKm: 17.3,
    };
    const snapshot = {
      storeDistancesSnapshotOnly: true,
      analysisTimestamp: '2026-10-20T00:00:00.000Z',
    } as PitchPackSnapshot;
    const line = pitchNearestStoreBriefLine(prospect, snapshot);
    expect(line).toContain('17.3');
    expect(line).toContain('snapshot');
  });
});
