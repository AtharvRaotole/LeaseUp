import { describe, it, expect, vi } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

// All demo chips now ship Overpass recordings; simulate an unrecorded chip.
vi.mock('@leaseup/fixtures', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@leaseup/fixtures')>()),
  overpassDemoByFixture: {},
}));

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

describe('Demo mode OSM honesty', () => {
  it('does not claim 2-source OSM verification without OSM snapshot tiles', async () => {
    const service = new AnalysisService(demoEnv());
    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'run-osm',
      'iphash'
    );

    for (const pack of result.prospects) {
      expect(pack.brand.verified).not.toBe('verified (2 sources)');
      expect(pack.brand.verified).not.toBe('conflict - likely present');
    }

    if (result.prospects.length > 0) {
      expect(result.prospects.every((p) => p.brand.verified === 'unverified (1 source)')).toBe(
        true
      );
    }
  });
});
