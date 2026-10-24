import { describe, it, expect } from 'vitest';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import {
  assertTopPercentCopyMatchesRank,
  brandRankSurfaceStrings,
} from '@leaseup/fixtures/worker';
import { AnalysisService } from '../services/analysis';
import { installWorkersCacheApiStub } from './helpers/kv-counting';

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

describe('demo report rank surfaces', () => {
  it('rank and top percent agree for every pitched brand on all demo chips', async () => {
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
        const surfaces = brandRankSurfaceStrings(rank, total, prospect.reasons[0]);
        const joined = surfaces.join('\n');
        expect(joined).not.toMatch(UNICODE_DASH);
        expect(joined).toContain(`#${rank} of ${total}`);
        assertTopPercentCopyMatchesRank(joined, rank, total);
      }
    }
  });
});
