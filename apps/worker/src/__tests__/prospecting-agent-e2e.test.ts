import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { ProspectingService } from '../services/prospecting';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineDemoAnalyzeEnv,
} from './helpers/analysis-test-env';
import { installWorkersCacheApiStub } from './helpers/kv-counting';

const store = new Map<string, string>();

function db() {
  return {
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
          if (sql.includes('analysis_runs')) return {};
          if (sql.includes('pitch_packs')) return {};
          return {};
        },
        async first() {
          if (sql.includes('prospecting_jobs')) {
            const payload = store.get(String(this.binds[0]));
            return payload ? { payload } : null;
          }
          return null;
        },
      };
      return stmt;
    },
  } as unknown as D1Database;
}

describe('prospecting agent e2e (demo wicker)', () => {
  beforeEach(() => {
    store.clear();
    installWorkersCacheApiStub();
    const repoRoot = join(__dirname, '../../../../');
    ensureWorkerGeotiles(repoRoot);
  });

  it('completes agent_plan with deterministic tool steps then pitch pack', async () => {
    const env = offlineDemoAnalyzeEnv(createDemoPublicAssetsFetcher(), {
      get: async () => null,
      put: async () => undefined,
    } as unknown as KVNamespace);
    env.DB = db();

    const service = new ProspectingService(env);
    const created = await service.create({
      address: DEMO_CHIP_ADDRESSES.wicker,
      radius: 10,
    });

    const job = await service.run(created.id, 'ip-hash');
    expect(job.status).toBe('complete');
    expect(job.pitchId).toBeDefined();

    const agentStep = job.steps.find((s) => s.id === 'agent_plan');
    expect(agentStep?.status).toBe('complete');
    const detail = agentStep?.detail as {
      agentSteps?: Array<{ tool: string; reason: string; resultSummary: string }>;
    };
    expect(detail?.agentSteps?.length).toBeGreaterThanOrEqual(2);
    expect(detail?.agentSteps?.some((s) => s.tool === 'qloo_brand_insights')).toBe(true);
    expect(detail?.agentSteps?.some((s) => s.tool === 'nearest_store_check')).toBe(true);

    // Log example for PR / audit (deterministic on demo wicker).
    console.log(
      JSON.stringify({ exampleAgentStepLog: detail?.agentSteps?.[0] }, null, 2)
    );
  }, 120_000);
});
