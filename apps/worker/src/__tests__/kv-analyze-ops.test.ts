import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

/** Pre-#45 typical cold live analyze (from docs/qa/kv-analyze-audit.md). */
export const LEGACY_KV_PER_ANALYZE_COLD = { gets: { min: 25, max: 55 }, puts: { min: 25, max: 55 } };
export const LEGACY_KV_PER_ANALYZE_WARM = { gets: { min: 10, max: 55 }, puts: { min: 10, max: 30 } };

/** Post-#45 target on demo fixture path (Wicker chip, precomputed insights). */
export const CURRENT_KV_PER_ANALYZE = { gets: 0, puts: 0 };

function installCacheApiStore() {
  const store = new Map<string, Response>();
  vi.stubGlobal('caches', {
    default: {
      match: async (req: Request | string) => {
        const url = typeof req === 'string' ? req : req.url;
        return store.get(url) ?? undefined;
      },
      put: async (req: Request | string, res: Response) => {
        const url = typeof req === 'string' ? req : req.url;
        store.set(url, res);
      },
    },
  });
  return store;
}

function createCountingKv() {
  const gets: string[] = [];
  const puts: string[] = [];
  const CACHE = {
    get: vi.fn(async (key: string) => {
      gets.push(key);
      return null;
    }),
    put: vi.fn(async (key: string) => {
      puts.push(key);
    }),
  } as unknown as KVNamespace;
  return { CACHE, gets, puts };
}

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

describe('/api/analyze KV operations (fixture-backed demo)', () => {
  beforeEach(() => {
    installCacheApiStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('counts KV gets and puts: cold then warm (0/0 after Cache API migration)', async () => {
    const kv = createCountingKv();
    const env = {
      DB: db,
      CACHE: kv.CACHE,
      APP_MODE: 'demo',
    } as import('../index').Env;

    const service = new AnalysisService(env);
    const req = { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 };

    await service.analyze(req, 'run-cold', 'test-ip');
    const coldGets = kv.gets.length;
    const coldPuts = kv.puts.length;

    await service.analyze(req, 'run-warm', 'test-ip');
    const warmGets = kv.gets.length - coldGets;
    const warmPuts = kv.puts.length - coldPuts;

    expect({ coldGets, coldPuts, warmGets, warmPuts }).toEqual({
      coldGets: CURRENT_KV_PER_ANALYZE.gets,
      coldPuts: CURRENT_KV_PER_ANALYZE.puts,
      warmGets: CURRENT_KV_PER_ANALYZE.gets,
      warmPuts: CURRENT_KV_PER_ANALYZE.puts,
    });

    expect(coldGets).toBeLessThan(LEGACY_KV_PER_ANALYZE_COLD.gets.min);
    expect(coldPuts).toBeLessThan(LEGACY_KV_PER_ANALYZE_COLD.puts.min);
  });
});
