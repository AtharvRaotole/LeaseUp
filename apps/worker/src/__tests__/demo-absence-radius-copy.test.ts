import { describe, it, expect } from 'vitest';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { AnalysisService } from '../services/analysis';
import { installWorkersCacheApiStub } from './helpers/kv-counting';

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

const WITHIN_KM_RE = /within (\d+(?:\.\d+)?) km/i;

describe('demo absence radius in worker reasons', () => {
  it('ATP absence line uses prospectFunnel.absenceRadiusKm for each demo chip', async () => {
    installWorkersCacheApiStub();
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../index').Env);

    for (const address of Object.values(DEMO_CHIP_ADDRESSES)) {
      const result = await service.analyze({ address, radius: 10 }, `abs-copy-${address}`, 'ip');
      const absenceKm = result.prospectFunnel?.absenceRadiusKm ?? 10;
      expect(absenceKm).toBeLessThanOrEqual(10);

      for (const pack of result.prospects) {
        const absenceLine = pack.reasons.find((r) => /store within/i.test(r));
        expect(absenceLine, `missing absence reason for ${pack.brand.name}`).toBeDefined();
        const match = absenceLine!.match(WITHIN_KM_RE);
        expect(match).toBeTruthy();
        expect(Number(match![1])).toBe(absenceKm);

        const nearest = pack.nearestExistingStoreKm ?? result.rankings?.find(
          (r) => r.entityId === pack.brand.entityId
        )?.nearestStoreKm;
        if (nearest !== undefined) {
          expect(absenceKm).toBeLessThanOrEqual(nearest);
        }
      }
    }
  });
});
