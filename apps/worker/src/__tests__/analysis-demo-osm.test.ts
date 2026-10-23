import { describe, it, expect } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { DEMO_CHIP_ADDRESSES, DEMO_OSM_UNRECORDED_NOTE } from '@leaseup/fixtures';

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
  it('does not claim 2-source OSM verification without a recorded Overpass file', async () => {
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
      expect(
        result.prospects.some((p) => p.coverageNote?.includes(DEMO_OSM_UNRECORDED_NOTE))
      ).toBe(true);
    }
  });
});
