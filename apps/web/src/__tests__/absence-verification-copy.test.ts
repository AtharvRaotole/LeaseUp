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
  it('states single-source absence in plain language', () => {
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
      'No store within 3 km in our store data.'
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
    expect(absenceVerificationSummary(prospect, 10, results)).toBe(
      'No store within 3 km (checked in our store data).'
    );
  });
});

describe('whyCardStoreCheckLine', () => {
  const prospect = (verified: string, verificationSources: string[]) =>
    ({
      brand: { verified, verificationSources, entityId: 'x', name: 'Test', affinity: 1, affinityRank: 1 },
    }) as ProspectPack;

  it('uses one plain line for ATP-only (Bleecker-like) prospects', () => {
    const line = whyCardStoreCheckLine(
      prospect('unverified (1 source)', ['All The Places (CC0)']),
      10,
      results,
      'Oct 24, 2026'
    );
    expect(line).toBe('No store within 3 km in our store data as of Oct 24, 2026.');
    expect(line).not.toMatch(/OpenStreetMap not checked/i);
    expect(line).not.toMatch(/All The Places/i);
    expect(line).not.toMatch(/[\u2013\u2014]/);
  });

  it('names checked date when both sources verified', () => {
    expect(
      whyCardStoreCheckLine(
        prospect('verified (2 sources)', ['All The Places (CC0)', 'OpenStreetMap']),
        10,
        results,
        'Oct 24, 2026'
      )
    ).toBe('No store within 3 km (checked Oct 24, 2026).');
  });

  it('does not append internal demo coverage markers to the why card', () => {
    const p = {
      ...prospect('unverified (1 source)', ['All The Places (CC0)']),
      coverageNote: 'OSM check not recorded for demo',
    } as ProspectPack;
    expect(whyCardStoreCheckLine(p, 10, results, 'Oct 24, 2026')).toBe(
      'No store within 3 km in our store data as of Oct 24, 2026.'
    );
    expect(whyCardStoreCheckLine(p, 10, results, 'Oct 24, 2026')).not.toMatch(/\bOSM\b/);
  });
});
