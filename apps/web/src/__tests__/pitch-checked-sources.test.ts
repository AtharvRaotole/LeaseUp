import { describe, it, expect } from 'vitest';
import {
  pitchCheckedSourcesLabel,
  PITCH_CHECKED_ATP_OSM_STORE_DATA_LABEL,
  PITCH_CHECKED_ATP_STORE_DATA_LABEL,
} from '../lib/copy';
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
    ).toBe(PITCH_CHECKED_ATP_OSM_STORE_DATA_LABEL);
    expect(
      pitchCheckedSourcesLabel(
        prospect({ entityId: 'b', name: 'B', verified: 'unverified (1 source)' })
      )
    ).toBe(PITCH_CHECKED_ATP_STORE_DATA_LABEL);
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
    ).toBe(PITCH_CHECKED_ATP_STORE_DATA_LABEL);
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
    ).toBe(PITCH_CHECKED_ATP_OSM_STORE_DATA_LABEL);
  });
});

describe('pitchBrandFitLines', () => {
  it('includes nearest store line and reasons without duplicating rank bullets', () => {
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
    expect(lines.some((l) => l.includes('#3 of 40'))).toBe(false);
    expect(lines.some((l) => l.includes('4.2 km') && l.includes('tracked chain store data'))).toBe(
      true
    );
    expect(lines.some((l) => l.includes('co-tenancy'))).toBe(true);
  });
});
