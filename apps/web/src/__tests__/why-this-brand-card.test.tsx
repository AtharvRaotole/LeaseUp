import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WhyThisBrandCard } from '../components/report/WhyThisBrandCard';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { expectTopPercentsMatchRank } from '../lib/rank-top-percent-copy';

const prospect: ProspectPack = {
  brand: {
    entityId: '205AF33F-118E-4C49-9721-6BDBAF981DA0',
    name: 'REI',
    affinity: 0.9,
    affinityRank: 3,
    verified: 'verified (2 sources)',
    verificationSources: ['All The Places (CC0)', 'OpenStreetMap'],
    nationalStoreCount: 100,
    nearbyStoreCount: 0,
  },
  reasons: ['Strong local affinity in Qloo rankings'],
  outreachDraft: '',
};

const results = {
  location: { address: 'x', latitude: 41.9, longitude: -87.7 },
  backtest: {
    totalStores: 10,
    predictedStores: 10,
    accuracy: 1,
    precisionAt10: 1,
    presentInTop10: 10,
    examples: [],
  },
  prospects: [prospect],
  dataQuality: 'high',
  warnings: [],
  runId: 'r1',
  timestamp: '2026-10-23T00:00:00.000Z',
  rankings: [{ entityId: prospect.brand.entityId, name: 'REI', affinity: 0.9, qlooRank: 3, blendedRank: 3, presentInRadius: false }],
} as AnalysisResponse;

describe('WhyThisBrandCard', () => {
  it('renders headline and reasons when a prospect is selected', () => {
    const html = renderToStaticMarkup(
      <WhyThisBrandCard prospect={prospect} results={results} radiusKm={10} />
    );
    expect(html).toContain('Why REI?');
    expect(html).toContain('All The Places');
  });

  it('uses one top percent consistent with rank and total scored', () => {
    const ultaRank = 26;
    const total = 224;
    const rankedProspect: ProspectPack = {
      ...prospect,
      brand: { ...prospect.brand, affinityRank: ultaRank },
      reasons: [
        `Ulta Beauty: LeaseUp rank #${ultaRank} (top 12% of ${total} brands) for Boulder`,
      ],
    };
    const rankedResults = {
      ...results,
      rankings: Array.from({ length: total }, (_, i) => ({
        entityId: i === ultaRank - 1 ? rankedProspect.brand.entityId : `e-${i}`,
        name: 'Brand',
        affinity: 0.5,
        qlooRank: i + 1,
        blendedRank: i + 1,
        presentInRadius: false,
      })),
    } as AnalysisResponse;

    const html = renderToStaticMarkup(
      <WhyThisBrandCard prospect={rankedProspect} results={rankedResults} radiusKm={10} />
    );
    expectTopPercentsMatchRank(html, ultaRank, total);
    expect(html).toContain('top 12%');
    expect(html).not.toContain('top 15%');
    expect(html).not.toContain('top 8%');
  });

  it('renders nothing without a prospect', () => {
    const html = renderToStaticMarkup(
      <WhyThisBrandCard prospect={null} results={results} radiusKm={10} />
    );
    expect(html).toBe('');
  });
});
