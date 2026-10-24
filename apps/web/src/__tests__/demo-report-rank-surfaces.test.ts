import { describe, it, expect } from 'vitest';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import type { AnalysisResponse } from '@leaseup/contracts';
import { brandReportRankSurfaces } from '../lib/brand-report-rank-surfaces';
import { expectTopPercentsMatchRank } from '../lib/rank-top-percent-copy';
import { installWorkersCacheApiStub } from '../../../worker/src/__tests__/helpers/kv-counting';

const UNICODE_DASH = /[\u2013\u2014]/;

const db = {
  prepare: () => {
    const stmt = {
      bind: () => stmt,
      run: async () => ({}),
      first: async () => null,
    };
    return stmt;
  },
} as unknown as D1Database;

const kv = {
  get: async () => null,
  put: async () => undefined,
} as unknown as KVNamespace;

function assertSurfacesForResults(results: AnalysisResponse, radiusKm: number): void {
  const total = results.rankings?.length ?? 0;
  expect(total).toBeGreaterThan(0);
  for (const prospect of results.prospects) {
    const rank = prospect.brand.affinityRank;
    const surfaces = brandReportRankSurfaces(prospect, results, radiusKm);
    const joined = surfaces.join('\n');
    expect(joined).not.toMatch(UNICODE_DASH);
    expect(joined).toContain(`#${rank} of ${total}`);
    expectTopPercentsMatchRank(joined, rank, total);
  }
}

describe('demo report rank surfaces', () => {
  it('all demo chip analyzes: rank and top percent agree on every pitched brand', async () => {
    installWorkersCacheApiStub();
    const { AnalysisService } = await import('../../../worker/src/services/analysis');
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../../../worker/src/index').Env);

    for (const address of [
      DEMO_CHIP_ADDRESSES.boulder,
      DEMO_CHIP_ADDRESSES.wicker,
      DEMO_CHIP_ADDRESSES.sevierville,
    ]) {
      const results = await service.analyze({ address, radius: 10 }, `web-rank-surfaces-${address}`, 'ip');
      assertSurfacesForResults(results as AnalysisResponse, 10);
    }
  });
});
