import { describe, it, expect } from 'vitest';
import { pitchPackVerificationSummary } from '../lib/copy';
import type { PitchPackSnapshot } from '@leaseup/contracts';

function row(verified: PitchPackSnapshot['prospects'][0]['prospect']['brand']['verified']) {
  return {
    prospect: {
      brand: {
        entityId: 'x',
        name: 'X',
        affinity: 1,
        affinityRank: 1,
        verified,
      },
      outreachDraft: '',
      reasons: [],
    },
    whyLine: '',
  };
}

describe('pitchPackVerificationSummary', () => {
  it('matches mixed per-brand verification on the pitch pack', () => {
    const snapshot = {
      prospects: [
        row('verified (2 sources)'),
        row('unverified (1 source)'),
        row('unverified (1 source)'),
        row('unverified (1 source)'),
        row('unverified (1 source)'),
      ],
    } as Pick<PitchPackSnapshot, 'prospects'>;
    expect(pitchPackVerificationSummary(snapshot)).toBe(
      '1 brand checked in our store data and OpenStreetMap; 4 brands checked in our store data only (no OpenStreetMap map for that chain).'
    );
  });
});
