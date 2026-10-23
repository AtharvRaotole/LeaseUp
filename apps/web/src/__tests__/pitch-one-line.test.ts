import { describe, it, expect } from 'vitest';
import { pitchOneLineWhy } from '../lib/pitch-one-line';
import type { ProspectPack } from '@leaseup/contracts';

const base: ProspectPack = {
  brand: {
    entityId: 'x',
    name: 'Test Brand',
    affinity: 0.9,
    affinityRank: 3,
    verified: 'verified (2 sources)',
  },
  outreachDraft: '',
  reasons: [],
  nearestExistingStoreKm: 4.2,
};

describe('pitchOneLineWhy', () => {
  it('uses first reason when present', () => {
    expect(pitchOneLineWhy({ ...base, reasons: ['Custom reason'] }, 100)).toBe('Custom reason');
  });

  it('builds line from rank and distance when no reasons', () => {
    const line = pitchOneLineWhy(base, 100);
    expect(line).toContain('rank 3');
    expect(line).toContain('4.2 km');
  });
});
