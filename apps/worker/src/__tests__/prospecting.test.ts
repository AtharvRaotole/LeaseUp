import { describe, it, expect, beforeEach } from 'vitest';
import type { ProspectingStep } from '@leaseup/contracts';
import { ProspectingService, syncProspectingStepDefs } from '../services/prospecting';
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

describe('syncProspectingStepDefs', () => {
  it('inserts agent_plan for legacy eight-step jobs', () => {
    const legacy: ProspectingStep[] = [
      { id: 'geocode', label: 'Geocode', status: 'complete' },
      { id: 'taste', label: 'Taste', status: 'pending' },
      { id: 'scan_stores', label: 'Scan', status: 'pending' },
      { id: 'verify_osm', label: 'Verify', status: 'pending' },
      { id: 'rank_backtest', label: 'Rank', status: 'pending' },
      { id: 'explain_top5', label: 'Explain', status: 'pending' },
      { id: 'draft_outreach', label: 'Draft', status: 'pending' },
      { id: 'pitch_pack', label: 'Pitch', status: 'pending' },
    ];
    const synced = syncProspectingStepDefs(legacy);
    expect(synced).toHaveLength(9);
    expect(synced[1]?.id).toBe('agent_plan');
    expect(synced[1]?.status).toBe('pending');
  });
});

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
