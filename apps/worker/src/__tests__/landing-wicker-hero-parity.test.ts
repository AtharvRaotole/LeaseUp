import { describe, it, expect } from 'vitest';
import { DEMO_CHIP_ADDRESSES, wickerLandingPitchTopEntityIds } from '@leaseup/fixtures';
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

describe('landing wicker hero parity', () => {
  it('demo analyze pitch order matches committed wicker landing pitch order', async () => {
    installWorkersCacheApiStub();
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../index').Env);

    const results = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10, storefrontSqFt: 2500 },
      'landing-wicker-parity',
      'ip'
    );

    const liveIds = results.prospects.slice(0, 10).map((p) => p.brand.entityId);
    expect(liveIds).toEqual(wickerLandingPitchTopEntityIds(10));
  });
});
