/**
 * Recorded Qloo heatmap cell shape from live API (see apps/worker/src/__tests__/qloo-heatmap.test.ts).
 * Regenerate full metro: node scripts/record-brand-reverse-fixture.mjs (requires QLOO_API_KEY).
 */
export type BrandReverseDemoFixture = {
  brandEntityId: string;
  metroId: string;
  source: 'heatmap' | 'grid_insights';
  sourceNote?: string;
  cells: Array<{
    latitude: number;
    longitude: number;
    affinity_rank: number;
    affinity?: number;
  }>;
};

export const brandReverseChicagoDemo: BrandReverseDemoFixture = {
  brandEntityId: '54617D9D-5EC7-45E0-8B7F-360DADB0FE7E',
  metroId: 'chicago',
  source: 'heatmap',
  sourceNote: 'Demo uses one recorded Qloo heatmap cell. Live mode loads the full metro heatmap.',
  cells: [
    { latitude: 41.8819, longitude: -87.6278, affinity_rank: 4, affinity: 0.8123 },
  ],
};
