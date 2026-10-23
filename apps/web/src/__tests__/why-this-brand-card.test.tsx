import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WhyThisBrandCard } from '../components/report/WhyThisBrandCard';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

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
    expect(html).toContain('Strong local affinity');
  });

  it('renders nothing without a prospect', () => {
    const html = renderToStaticMarkup(
      <WhyThisBrandCard prospect={null} results={results} radiusKm={10} />
    );
    expect(html).toBe('');
  });
});
