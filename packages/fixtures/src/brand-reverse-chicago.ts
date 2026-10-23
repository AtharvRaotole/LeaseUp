/**
 * Real Qloo heatmap recordings (hackathon.api.qloo.com, urn:heatmap) with provenance.
 * Regenerate: QLOO_API_KEY=... node scripts/record-brand-reverse-fixture.mjs chicago denver austin
 */
import chicago from './brand-reverse/chicago.json';
import denver from './brand-reverse/denver.json';
import austin from './brand-reverse/austin.json';

export type BrandReverseDemoFixture = {
  brandEntityId: string;
  metroId: string;
  source: 'heatmap' | 'grid_insights';
  sourceNote?: string;
  provenance: {
    recordedAt: string;
    host: string;
    method: string;
    path: string;
    params: Record<string, string>;
    httpStatus: number;
    rawCellCount: number;
    note: string;
  };
  cells: Array<{
    latitude: number;
    longitude: number;
    geohash?: string;
    affinity_rank: number;
    affinity?: number;
    popularity?: number;
  }>;
};

export const brandReverseFixtures: Partial<Record<string, BrandReverseDemoFixture>> = {
  chicago: chicago as BrandReverseDemoFixture,
  denver: denver as BrandReverseDemoFixture,
  austin: austin as BrandReverseDemoFixture,
};

export const brandReverseChicagoDemo: BrandReverseDemoFixture = chicago as BrandReverseDemoFixture;
