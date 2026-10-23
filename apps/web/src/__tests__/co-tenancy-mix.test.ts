import { describe, it, expect } from 'vitest';
import { buildCoTenancyMix } from '../lib/co-tenancy-mix';
describe('co-tenancy mix', () => {
  it('counts nearby vs prospect categories', () => {
    const results = {
      rankings: [
        {
          entityId: 'a',
          name: 'Sephora',
          affinity: 1,
          qlooRank: 1,
          blendedRank: 1,
          presentInRadius: true,
        },
      ],
      prospects: [
        {
          brand: {
            entityId: 'b',
            name: 'Vans',
            affinity: 1,
            affinityRank: 2,
            verified: 'verified (2 sources)',
          },
          outreachDraft: '',
          reasons: [],
          tenantMixScore: { score: 0, coAffinityMean: 0, categoryFit: 'Apparel', explanation: '' },
        },
      ],
    } as unknown as import('@leaseup/contracts').AnalysisResponse;
    const rows = buildCoTenancyMix(results);
    expect(rows.some((r) => r.prospectCount > 0)).toBe(true);
  });
});
