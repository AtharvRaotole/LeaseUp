import { describe, it, expect } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
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

describe('prospect reasons copy', () => {
  it('uses a distinct first reason per Boulder demo prospect (no shared blend boilerplate)', async () => {
    installWorkersCacheApiStub();
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../index').Env);

    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.boulder, radius: 10 },
      'boulder-reasons',
      'ip'
    );

    expect(result.prospects.length).toBeGreaterThan(1);
    const firstLines = result.prospects.map((p) => p.reasons[0]).filter(Boolean);
    expect(firstLines.length).toBe(result.prospects.length);
    expect(new Set(firstLines).size).toBe(firstLines.length);
    for (const pack of result.prospects) {
      expect(pack.reasons[0]).toContain(`LeaseUp rank #${pack.brand.affinityRank}`);
      expect(pack.reasons[0]).not.toMatch(/fitted taste-aware blend/i);
      expect(pack.reasons[0]).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
