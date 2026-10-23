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

describe('AnalysisService demo mode', () => {
  it('rejects non-chip addresses', async () => {
    const service = new AnalysisService(demoEnv());
    await expect(
      service.analyze({ address: '100 Main St, Milwaukee, WI', radius: 10 }, 'run-1', 'iphash')
    ).rejects.toThrow(/live mode/i);
  });

  it('accepts exact demo chip addresses', async () => {
    const service = new AnalysisService(demoEnv());
    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'run-2',
      'iphash'
    );
    expect(result.prospects.length).toBeGreaterThanOrEqual(0);
    expect(result.location.latitude).toBeCloseTo(41.9088, 2);
  });
});
