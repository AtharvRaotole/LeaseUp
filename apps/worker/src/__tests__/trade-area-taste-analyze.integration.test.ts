import { describe, it, expect, vi } from 'vitest';
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

  it('attaches Who shops here snapshot on demo analyze without KV writes', async () => {
    const put = vi.fn();
    const cache = { get: async () => null, put } as unknown as KVNamespace;
    const service = new AnalysisService({ ...demoEnv(), CACHE: cache });
    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'run-shoppers',
      'iphash'
    );
    expect(result.tradeAreaShoppers?.summary).toMatch(/Shoppers here over-index/);
    expect(put).not.toHaveBeenCalled();
  });

  it('attaches brand reach contacts on prospects when known', async () => {
    const service = new AnalysisService(demoEnv());
    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'run-reach',
      'iphash'
    );
    const withReach = result.prospects.filter((p) => p.brandReach);
    expect(withReach.length).toBeGreaterThan(0);
    expect(
      withReach.some(
        (p) =>
          (p.brandReach?.status === 'verified' && p.brandReach.url) ||
          (p.brandReach?.status === 'not_yet_found' && p.brandReach.searchUrl)
      )
    ).toBe(true);
  });
});
