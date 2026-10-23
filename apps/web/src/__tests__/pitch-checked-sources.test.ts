import { describe, it, expect } from 'vitest';
import { pitchCheckedSourcesLabel } from '../lib/copy';
import type { ProspectPack } from '@leaseup/contracts';
import { pitchBrandFitLines } from '../lib/pitch-pack-copy';

function prospect(partial: Partial<ProspectPack['brand']> & { entityId: string; name: string }): ProspectPack {
  const { entityId, name, ...brandRest } = partial;
  return {
    brand: {
      entityId,
      name,
      affinity: 1,
      affinityRank: 1,
      verified: 'verified (2 sources)',
      ...brandRest,
    },
    outreachDraft: '',
    reasons: [],
  };
}

describe('pitchCheckedSourcesLabel', () => {
  it('uses verified status when sources are missing', () => {
    expect(
      pitchCheckedSourcesLabel(
        prospect({ entityId: 'a', name: 'A', verified: 'verified (2 sources)' })
      )
    ).toBe('Checked in 2 sources');
    expect(
      pitchCheckedSourcesLabel(
        prospect({ entityId: 'b', name: 'B', verified: 'unverified (1 source)' })
      )
    ).toBe('Checked in 1 source');
  });

  it('counts All The Places and OpenStreetMap rows', () => {
    expect(
      pitchCheckedSourcesLabel(
        prospect({
          entityId: 'c',
          name: 'C',
          verified: 'unverified',
          verificationSources: ['All The Places: no store within 10 km'],
        })
      )
    ).toBe('Checked in 1 source');
    expect(
      pitchCheckedSourcesLabel(
        prospect({
          entityId: 'd',
          name: 'D',
          verified: 'verified (2 sources)',
          verificationSources: [
            'All The Places: no store within 10 km',
            'OpenStreetMap: no store within 10 km',
          ],
        })
      )
    ).toBe('Checked in 2 sources');
  });
});

describe('pitchBrandFitLines', () => {
  it('includes rank, nearest store, and reasons', () => {
    const snapshot = {
      radiusKm: 10,
      rankingsTotal: 40,
      prospects: [],
      osmSnapshotLabel: 'OpenStreetMap',
    } as const;
    const lines = pitchBrandFitLines(
      {
        brand: {
          entityId: 'nike',
          name: 'Nike',
          affinity: 1,
          affinityRank: 3,
          verified: 'verified (2 sources)',
        },
        outreachDraft: '',
        reasons: ['Strong co-tenancy with local apparel'],
        nearestExistingStoreKm: 4.2,
      },
      snapshot as never
    );
    expect(lines[0]).toContain('#3 of 40');
    expect(lines.some((l) => l.includes('4.2 km'))).toBe(true);
    expect(lines.some((l) => l.includes('co-tenancy'))).toBe(true);
  });
});
