import { describe, it, expect } from 'vitest';
import {
  assertVisitorRecheckKvAllowed,
  recordVisitorRecheckKv,
  RecheckDailyLimitError,
  VISITOR_RECHECK_KV_MAX_PER_DAY,
} from '../lib/watch-recheck-kv-limit';

function memoryKv(): KVNamespace {
  const data = new Map<string, string>();
  return {
    get: async (key: string) => data.get(key) ?? null,
    put: async (key: string, value: string) => {
      data.set(key, value);
    },
    delete: async (key: string) => {
      data.delete(key);
    },
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
  } as unknown as KVNamespace;
}

describe('watch recheck KV daily limit', () => {
  it('blocks after the per-visitor daily cap', async () => {
    const kv = memoryKv();
    const visitorId = '00000000-0000-4000-8000-000000000001';
    const now = Date.UTC(2026, 9, 24, 12, 0, 0);
    for (let i = 0; i < VISITOR_RECHECK_KV_MAX_PER_DAY; i++) {
      await assertVisitorRecheckKvAllowed(kv, visitorId, now);
      await recordVisitorRecheckKv(kv, visitorId, now);
    }
    await expect(assertVisitorRecheckKvAllowed(kv, visitorId, now)).rejects.toThrow(
      RecheckDailyLimitError
    );
  });
});
