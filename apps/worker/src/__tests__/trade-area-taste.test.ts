import { describe, it, expect } from 'vitest';
import { loadTradeAreaTasteForProspect } from '../lib/trade-area-taste';
import { QlooClient } from '../providers/qloo';
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

describe('loadTradeAreaTasteForProspect', () => {
  it('returns recorded tags for Boulder demo REI', async () => {
    const qloo = new QlooClient({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
      QLOO_API_KEY: '',
    } as import('../index').Env);

    const taste = await loadTradeAreaTasteForProspect(
      qloo,
      {
        address: DEMO_CHIP_ADDRESSES.boulder,
        latitude: 40.0179234,
        longitude: -105.2805434,
      },
      '205AF33F-118E-4C49-9721-6BDBAF981DA0',
      10
    );

    expect(taste?.tags.length).toBeGreaterThan(0);
    expect(taste?.tags[0]?.name.length).toBeGreaterThan(0);
  });
});
