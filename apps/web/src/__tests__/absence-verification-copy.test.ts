import { describe, it, expect } from 'vitest';
import { absenceVerificationSummary, whyCardStoreCheckLine } from '../lib/absence-verification-copy';
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

describe('whyCardStoreCheckLine', () => {
  const prospect = (verified: string, verificationSources: string[]) =>
    ({
      brand: { verified, verificationSources, entityId: 'x', name: 'Test', affinity: 1, affinityRank: 1 },
    }) as ProspectPack;

  it('merges the ATP-only result, date and OSM status into one plain line', () => {
    const line = whyCardStoreCheckLine(
      prospect('unverified (1 source)', ['All The Places (CC0)']),
      10,
      results,
      'Oct 24, 2026'
    );
    expect(line).toBe(
      'No store within 3 km in All The Places (store data as of Oct 24, 2026). OpenStreetMap not checked yet.'
    );
    expect(line).not.toMatch(/Checked against|Not yet checked in OpenStreetMap snapshot/);
    expect(line).not.toMatch(/[\u2013\u2014]/);
  });

  it('names both sources once when verified', () => {
    expect(
      whyCardStoreCheckLine(
        prospect('verified (2 sources)', ['All The Places (CC0)', 'OpenStreetMap']),
        10,
        results,
        'Oct 24, 2026'
      )
    ).toBe('No store within 3 km in All The Places or OpenStreetMap (store data as of Oct 24, 2026).');
  });

  it('keeps the demo OSM note accurate', () => {
    const p = {
      ...prospect('unverified (1 source)', ['All The Places (CC0)']),
      coverageNote: 'OSM check not recorded for demo',
    } as ProspectPack;
    expect(whyCardStoreCheckLine(p, 10, results, 'Oct 24, 2026')).toBe(
      'No store within 3 km in All The Places (store data as of Oct 24, 2026). OSM check not recorded for demo.'
    );
  });
});
