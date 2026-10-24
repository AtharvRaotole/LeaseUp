import { describe, it, expect } from 'vitest';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { rankTopPercentFromOrder } from '@leaseup/fixtures/worker';
import type { AnalysisResponse } from '@leaseup/contracts';
import { AnalysisService } from '../services/analysis';
import { installWorkersCacheApiStub } from './helpers/kv-counting';
import { brandReportRankSurfaces } from '../../../web/src/lib/brand-report-rank-surfaces';
import { expectTopPercentsMatchRank } from '../../../web/src/lib/rank-top-percent-copy';

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

function assertRankHashMatchesAffinity(surfaces: string[], rank: number, total: number): void {
  const hashLine = surfaces.find((s) => /#\d+ of \d+ brands/.test(s));
  if (hashLine) {
    expect(hashLine).toContain(`#${rank} of ${total}`);
  }
}

describe('demo report rank surfaces', () => {
  it('agrees on rank and top percent for every pitched brand on demo chips', async () => {
    installWorkersCacheApiStub();
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../index').Env);

    for (const address of [
      DEMO_CHIP_ADDRESSES.boulder,
      DEMO_CHIP_ADDRESSES.wicker,
      DEMO_CHIP_ADDRESSES.sevierville,
    ]) {
      const results = await service.analyze({ address, radius: 10 }, `rank-surfaces-${address}`, 'ip');
      const total = results.rankings?.length ?? 0;
      expect(total).toBeGreaterThan(0);

      for (const prospect of results.prospects) {
        const rank = prospect.brand.affinityRank;
        const surfaces = brandReportRankSurfaces(prospect, results as AnalysisResponse, 10);
        const joined = surfaces.join('\n');
        expect(joined).not.toMatch(UNICODE_DASH);
        assertRankHashMatchesAffinity(surfaces, rank, total);
        expectTopPercentsMatchRank(joined, rank, total);
        expect(rankTopPercentFromOrder(rank, total)).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
