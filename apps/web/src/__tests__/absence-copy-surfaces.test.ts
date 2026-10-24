import { describe, it, expect } from 'vitest';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import {
  assertAbsenceCopyMatchesNearestStore,
  absenceClaimTextsForProspect,
} from '../lib/absence-copy-surfaces';
import { reportHeadlineLine } from '../lib/report-headline-copy';

const funnel = {
  brandsScored: 224,
  searchRadiusKm: 10,
  absenceRadiusKm: 3,
  alreadyNearbyCount: 42,
  strongFitAbsentCount: 8,
  pitchedCount: 8,
  verifiedCount: 0,
};

function baseResults(prospects: ProspectPack[]): AnalysisResponse {
  return {
    location: {
      address: '1560 N Milwaukee Ave, Chicago, IL 60622',
      latitude: 41.91,
      longitude: -87.68,
      city: 'Chicago',
      neighborhood: 'Wicker Park',
    },
    backtest: {
      totalStores: 10,
      predictedStores: 10,
      accuracy: 1,
      precisionAt10: 1,
      presentInTop10: 4,
      examples: [],
    },
    prospects,
    dataQuality: 'high',
    warnings: [],
    runId: 'r',
    timestamp: '2026-10-24T00:00:00.000Z',
    prospectFunnel: funnel,
    rankings: prospects.map((p) => ({
      entityId: p.brand.entityId,
      name: p.brand.name,
      affinity: 0.9,
      qlooRank: 1,
      blendedRank: 1,
      presentInRadius: false,
      nearestStoreKm: p.nearestExistingStoreKm,
    })),
  } as AnalysisResponse;
}

describe('absence copy vs nearest store', () => {
  it('headline uses 3 km absence, not 10 km search', () => {
    const results = baseResults([
      {
        brand: {
          entityId: 'tj',
          name: 'TJ Maxx',
          affinity: 0.9,
          affinityRank: 1,
          verified: 'unverified (1 source)',
          verificationSources: ['All The Places (CC0)'],
        },
        reasons: ['No TJ Maxx store within 3 km (All The Places store data)'],
        outreachDraft: '',
        nearestExistingStoreKm: 3.69,
      },
    ]);
    const line = reportHeadlineLine(results, 'Wicker Park', 10);
    expect(line).toContain('within 3 km');
    expect(line).not.toContain('within 10 km');
  });

  it('does not state absence radius above nearest store km', () => {
    const prospect: ProspectPack = {
      brand: {
        entityId: 'tj',
        name: 'TJ Maxx',
        affinity: 0.9,
        affinityRank: 1,
        verified: 'unverified (1 source)',
        verificationSources: ['All The Places (CC0)'],
      },
      reasons: ['No TJ Maxx store within 3 km (All The Places store data)'],
      outreachDraft: '',
      nearestExistingStoreKm: 3.69,
    };
    const results = baseResults([prospect]);
    expect(() =>
      assertAbsenceCopyMatchesNearestStore(prospect, results, 10, 'Wicker Park')
    ).not.toThrow();
    const texts = absenceClaimTextsForProspect(prospect, results, 10, 'Wicker Park');
    expect(texts.join(' ')).not.toMatch(/within 10 km/i);
  });
});
