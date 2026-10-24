import { describe, it, expect } from 'vitest';
import { nearestStoreDistanceAttribution } from '../lib/store-distance-copy';
import { pitchNearestStoreBriefLine } from '../lib/pitch-pack-copy';
import type { PitchPackSnapshot, ProspectPack } from '@leaseup/contracts';

describe('store distance copy', () => {
  it('labels snapshot-only distances with the snapshot date', () => {
    expect(
      nearestStoreDistanceAttribution(true, '2026-10-20T00:00:00.000Z')
    ).toContain('snapshot');
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
