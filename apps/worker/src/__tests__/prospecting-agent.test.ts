import { describe, it, expect, beforeEach } from 'vitest';
import type { ProspectingPlannerClient, ProspectingPlannerTurn } from '../lib/prospecting-agent-planner';
import { runProspectingAgentPlanner } from '../lib/prospecting-agent-planner';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { QlooClient } from '../providers/qloo';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineDemoAnalyzeEnv,
} from './helpers/analysis-test-env';
import { installWorkersCacheApiStub } from './helpers/kv-counting';
import { join } from 'node:path';

class ScriptedPlanner implements ProspectingPlannerClient {
  private index = 0;
  constructor(private readonly script: ProspectingPlannerTurn[]) {}

  async nextTurn(): Promise<ProspectingPlannerTurn> {
    const turn = this.script[this.index] ?? { toolCalls: [], done: true };
    this.index += 1;
    return turn;
  }
}

const WICKER_LOC = {
  address: DEMO_CHIP_ADDRESSES.wicker,
  latitude: 41.9099418,
  longitude: -87.6772824,
  city: 'Chicago',
  neighborhood: 'Wicker Park',
  resolvedAddress: DEMO_CHIP_ADDRESSES.wicker,
};

describe('runProspectingAgentPlanner', () => {
  beforeEach(() => {
    installWorkersCacheApiStub();
  });

  it('logs each tool decision with reason and result summary', async () => {
    const repoRoot = join(__dirname, '../../../../');
    ensureWorkerGeotiles(repoRoot);
    const env = offlineDemoAnalyzeEnv(createDemoPublicAssetsFetcher(), {
      get: async () => null,
      put: async () => undefined,
    } as unknown as KVNamespace);

    const script: ProspectingPlannerTurn[] = [
      {
        assistantReason: 'Need baseline taste panel.',
        toolCalls: [
          {
            name: 'qloo_brand_insights',
            reason: 'Check affinity depth before absence scan.',
            arguments: { take: 40 },
          },
        ],
        done: false,
      },
      {
        toolCalls: [
          {
            name: 'store_presence_lookup',
            reason: 'Confirm absence radius for a ranked brand.',
            arguments: {
              entityId: '2D890327-8794-4C5A-898F-FFF0323325CF',
              radiusKm: 3,
            },
          },
        ],
        done: false,
      },
      { toolCalls: [], done: true },
    ];

    const result = await runProspectingAgentPlanner({
      env,
      location: WICKER_LOC,
      radiusKm: 10,
      runId: 'agent-unit',
      qloo: new QlooClient(env),
      planner: new ScriptedPlanner(script),
    });

    expect(result.mode).toBe('agent');
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    expect(result.steps[0]!.reason).toContain('affinity');
    expect(result.steps[0]!.resultSummary).toMatch(/Qloo returned \d+ brand insights/);
    expect(result.steps[1]!.tool).toBe('store_presence_lookup');
    expect(result.steps[1]!.resultSummary.length).toBeGreaterThan(5);
  });

  it('falls back to DAG mode when planner is unavailable', async () => {
    const env = {
      DB: {} as D1Database,
      CACHE: { get: async () => null, put: async () => undefined } as KVNamespace,
      APP_MODE: 'live',
      OPENAI_API_KEY: '',
    } as import('../index').Env;

    const result = await runProspectingAgentPlanner({
      env,
      location: {
        ...WICKER_LOC,
        address: '999 Unknown Ave, Nowhere, ZZ 00000',
      },
      radiusKm: 10,
      runId: 'no-planner',
      qloo: { getBrandInsights: async () => [] } as import('../providers/qloo').QlooClient,
      planner: null,
    });

    expect(result.mode).toBe('dag_fallback');
    expect(result.steps).toHaveLength(0);
  });
});
