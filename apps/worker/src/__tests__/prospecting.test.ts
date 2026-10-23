import { describe, it, expect, beforeEach } from 'vitest';
import { ProspectingService } from '../services/prospecting';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

const store = new Map<string, string>();

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
          store.set(String(this.binds[0]), String(this.binds[1]));
        }
        return {};
      },
      async first() {
        if (sql.includes('SELECT payload FROM prospecting_jobs')) {
          const payload = store.get(String(this.binds[0]));
          return payload ? { payload } : null;
        }
        return null;
      },
    };
    return stmt;
  },
} as unknown as D1Database;

const kv = {
  get: async () => null,
  put: async () => undefined,
} as unknown as KVNamespace;

function demoEnv() {
  return { DB: db, CACHE: kv, APP_MODE: 'demo' } as import('../index').Env;
}

describe('ProspectingService', () => {
  beforeEach(() => store.clear());

  it('creates a ready job for demo chip addresses', async () => {
    const service = new ProspectingService(demoEnv());
    const job = await service.create({
      address: DEMO_CHIP_ADDRESSES.wicker,
      radius: 10,
    });
    expect(job.status).toBe('ready');
    expect(job.confirmedLocation?.latitude).toBeDefined();
    expect(job.steps.find((s) => s.id === 'geocode')?.status).toBe('complete');
  });
});
