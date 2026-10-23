import { describe, it, expect } from 'vitest';
import { prospectOneLineReason } from '../lib/prospect-one-line';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

const baseProspect = (overrides: Partial<ProspectPack> = {}): ProspectPack =>
  ({
    brand: {
      entityId: 'a',
      name: 'Test Brand',
      affinity: 0.9,
      affinityRank: 3,
      verified: 'unverified',
    },
    outreachDraft: '',
    reasons: [],
    ...overrides,
  }) as ProspectPack;

const baseResults = {
  rankings: [{ entityId: 'a', name: 'Test', affinity: 0.9, qlooRank: 1, blendedRank: 1, presentInRadius: false }],
} as AnalysisResponse;

describe('prospectOneLineReason', () => {
  it('prefers stored reasons when present', () => {
    const line = prospectOneLineReason(
      baseProspect({ reasons: ['Strong local fit for apparel.'] }),
      baseResults,
      10
    );
    expect(line).toBe('Strong local fit for apparel.');
  });
});
