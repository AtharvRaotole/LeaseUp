import { describe, it, expect } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

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

function demoEnv() {
  return {
    DB: db,
    CACHE: kv,
    APP_MODE: 'demo',
  } as import('../index').Env;
}

describe('tradeAreaTaste on analyze response', () => {
  it('attaches recorded taste for top Sevierville prospect (Sephora)', async () => {
    const service = new AnalysisService(demoEnv());
    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.sevierville, radius: 10 },
      'run-taste',
      'iphash'
    );
    const sephora = result.prospects.find(
      (p) => p.brand.entityId === '2C5054E1-8691-4F52-83CD-310D029BA6A3'
    );
    expect(sephora).toBeDefined();
    expect(sephora!.tradeAreaTaste?.tags?.length).toBeGreaterThan(0);
    expect(sephora!.tradeAreaTaste?.tags?.[0]?.affinityRank).toBeGreaterThan(0);
  });
});
