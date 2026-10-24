import { describe, it, expect } from 'vitest';
import { brandReachForProspect } from '../lib/brand-reach';
import type { ProspectPack } from '@leaseup/contracts';

const ULTA_ID = '0F77E9A4-121C-4941-ACE1-28502DBF1865';

function baseProspect(entityId: string, name: string): ProspectPack {
  return {
    brand: {
      entityId,
      name,
      affinity: 1,
      affinityRank: 1,
      verified: 'unverified (1 source)',
    },
    outreachDraft: '',
    reasons: [],
  };
}

describe('brandReachForProspect', () => {
  it('uses snapshot brandReach when present', () => {
    const reach = brandReachForProspect({
      ...baseProspect(ULTA_ID, 'Ulta'),
      brandReach: {
        status: 'verified',
        url: 'https://www.ulta.com/company/real-estate',
        source: 'https://www.ulta.com/company/real-estate',
      },
    });
    expect(reach?.status).toBe('verified');
    expect(reach?.url).toContain('ulta.com');
  });

  it('falls back to fixtures catalog for verified real-estate URLs', () => {
    const reach = brandReachForProspect(
      baseProspect('DFFF4470-F663-4742-A503-4FD0CB152498', 'Athleta')
    );
    expect(reach?.status).toBe('verified');
    expect(reach?.url).toMatch(/gapinc\.com/i);
  });

  it('returns search link when catalog has no verified page', () => {
    const reach = brandReachForProspect(
      baseProspect('A94FC7B6-34D3-4970-9EA5-2D17C49E84B6', 'TJ Maxx')
    );
    expect(reach?.status).toBe('not_yet_found');
    expect(reach?.searchUrl).toMatch(/google\.com\/search/);
  });
});
