import { describe, it, expect } from 'vitest';
import { verificationSourceHelp } from '../lib/copy';
import type { ProspectPack } from '@leaseup/contracts';

describe('verificationSourceHelp', () => {
  it('names ATP and missing OSM for one-source badge', () => {
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
    const help = verificationSourceHelp(prospect, 10, 'OpenStreetMap snapshot');
    expect(help).toContain('All The Places');
    expect(help).toMatch(/Not checked/i);
    expect(help).toContain('OpenStreetMap');
  });
});
