import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PitchService } from '../services/pitch';
import { PortfolioService } from '../services/portfolio';
import { ProspectingService } from '../services/prospecting';
import type { AnalysisResponse } from '@leaseup/contracts';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

function minimalResults(): AnalysisResponse {
  return {
    location: {
      address: DEMO_CHIP_ADDRESSES.wicker,
      latitude: 41.9088,
      longitude: -87.6776,
      neighborhood: 'Wicker Park',
    },
    backtest: {
      totalStores: 10,
      predictedStores: 5,
      accuracy: 0.5,
      precisionAt10: 0.5,
      examples: [],
    },
    prospects: [],
    dataQuality: 'high',
    warnings: [],
    runId: 'run-test',
    timestamp: '2026-01-01T00:00:00.000Z',
    mode: 'demo',
  };
}

/**
 * Documents where durable data lives after #45. None of these routes write KV today.
 */

function countingKv() {
  const puts: string[] = [];
  const gets: string[] = [];
  return {
    CACHE: {
      get: vi.fn(async (key: string) => {
        gets.push(key);
        return null;
      }),
      put: vi.fn(async (key: string) => {
        puts.push(key);
      }),
    } as unknown as KVNamespace,
    puts,
    gets,
  };
}

function mockDb(run: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue({})) {
  return {
    prepare: () => {
      const stmt = { bind: () => stmt, run, first: async () => null };
      return stmt;
    },
  } as unknown as D1Database;
}

describe('KV usage on share / portfolio / job routes', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', {
      default: { match: async () => undefined, put: async () => undefined },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /pitch persists via D1 only (0 KV ops)', async () => {
    const kv = countingKv();
    const run = vi.fn().mockResolvedValue({});
    const env = { DB: mockDb(run), CACHE: kv.CACHE, APP_MODE: 'demo' } as import('../index').Env;

    await new PitchService(env).create({
      radiusKm: 10,
      results: minimalResults(),
    });

    expect(kv.puts).toHaveLength(0);
    expect(kv.gets).toHaveLength(0);
    expect(run).toHaveBeenCalled();
  });

  it('portfolio create uses D1 only (0 KV ops)', async () => {
    const kv = countingKv();
    const run = vi.fn().mockResolvedValue({});
    const env = { DB: mockDb(run), CACHE: kv.CACHE, APP_MODE: 'demo' } as import('../index').Env;

    await new PortfolioService(env).create({ addresses: ['1125 Pearl St, Boulder, CO'] });

    expect(kv.puts).toHaveLength(0);
    expect(kv.gets).toHaveLength(0);
  });

  it('prospecting create uses D1 only (0 KV ops)', async () => {
    const jobStore = new Map<string, string>();
    const kv = countingKv();
    const db = {
      prepare: (sql: string) => {
        const stmt = {
          binds: [] as unknown[],
          bind(...args: unknown[]) {
            this.binds = args;
            return this;
          },
          async run() {
            if (sql.includes('prospecting_jobs')) {
              jobStore.set(String(this.binds[0]), String(this.binds[1]));
            }
            return {};
          },
          async first() {
            if (sql.includes('SELECT payload FROM prospecting_jobs')) {
              const payload = jobStore.get(String(this.binds[0]));
              return payload ? { payload } : null;
            }
            return null;
          },
        };
        return stmt;
      },
    } as unknown as D1Database;
    const env = { DB: db, CACHE: kv.CACHE, APP_MODE: 'demo' } as import('../index').Env;

    await new ProspectingService(env).create({
      address: DEMO_CHIP_ADDRESSES.boulder,
      radius: 10,
    });

    expect(kv.puts).toHaveLength(0);
    expect(kv.gets).toHaveLength(0);
  });
});
