import { describe, it, expect } from 'vitest';
import { absenceVerificationSummary } from '../lib/absence-verification-copy';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

const results = {
  osmSnapshotLabel: 'OpenStreetMap snapshot',
  prospectFunnel: {
    brandsScored: 224,
    searchRadiusKm: 10,
    absenceRadiusKm: 3,
    alreadyNearbyCount: 42,
    strongFitAbsentCount: 8,
    pitchedCount: 8,
    verifiedCount: 0,
  },
} as AnalysisResponse;

describe('absenceVerificationSummary', () => {
  it('states ATP-only absence when OSM not checked', () => {
    const prospect = {
      brand: {
        verified: 'unverified (1 source)',
        verificationSources: ['All The Places (CC0)'],
        entityId: 'x',
        name: 'Test',
        affinity: 1,
        affinityRank: 1,
      },
    } as ProspectPack;
    expect(absenceVerificationSummary(prospect, 10, results)).toBe(
      'No store within 3 km in All The Places. Not yet checked in OpenStreetMap snapshot.'
    );
  });

  it('states two-source absence when verified', () => {
    const prospect = {
      brand: {
        verified: 'verified (2 sources)',
        verificationSources: ['All The Places (CC0)', 'OpenStreetMap'],
        entityId: 'x',
        name: 'Test',
        affinity: 1,
        affinityRank: 1,
      },
    } as ProspectPack;
    expect(absenceVerificationSummary(prospect, 10, results)).toContain(
      'No store within 3 km in All The Places or OpenStreetMap snapshot'
    );
  });
});
