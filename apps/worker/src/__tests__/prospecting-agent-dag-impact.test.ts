import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { AnalysisService } from '../services/analysis';
import { createQlooRunAccounting, QlooClient } from '../providers/qloo';
import { runProspectingAgentPlanner } from '../lib/prospecting-agent-planner';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineDemoAnalyzeEnv,
} from './helpers/analysis-test-env';
import { installWorkersCacheApiStub } from './helpers/kv-counting';

const request = {
  address: DEMO_CHIP_ADDRESSES.wicker,
  radius: 10,
  storefrontSqFt: 2500,
};

describe('prospecting agent DAG impact', () => {
  beforeEach(() => {
    installWorkersCacheApiStub();
    ensureWorkerGeotiles(join(__dirname, '../../../../'));
  });

  it('changes final prospect order versus plain DAG when planner boosts a stratum brand', async () => {
    const env = offlineDemoAnalyzeEnv(createDemoPublicAssetsFetcher(), {
      get: async () => null,
      put: async () => undefined,
    } as unknown as KVNamespace);

    const service = new AnalysisService(env);
    const baselineAccounting = createQlooRunAccounting();
    const baselineQloo = new QlooClient(env, baselineAccounting);
    const baseline = await service.analyzeWithSteps(
      request,
      'baseline-dag',
      'ip',
      undefined,
      { qlooClient: baselineQloo }
    );
    const baselineQlooCalls = baselineQloo.getLogicalCallCount();

    const runAccounting = createQlooRunAccounting();
    const runQloo = new QlooClient(env, runAccounting);
    const plan = await runProspectingAgentPlanner({
      env,
      location: {
        address: request.address,
        latitude: 41.9099418,
        longitude: -87.6772824,
        resolvedAddress: request.address,
        neighborhood: 'Wicker Park',
        city: 'Chicago',
      },
      radiusKm: request.radius,
      runId: 'agent-plan',
      qloo: runQloo,
    });

    expect(plan.mode).toBe('agent');
    expect(plan.dagHooks.stratumBoostEntityIds?.size ?? 0).toBeGreaterThan(0);

    const withAgent = await service.analyzeWithSteps(request, 'with-agent-dag', 'ip', undefined, {
      agentDagHooks: plan.dagHooks,
      qlooClient: runQloo,
      captureProspectRankingDiff: true,
      plannerAgentSteps: plan.steps,
    });

    const baselineIds = baseline.prospects.map((p) => p.brand.entityId);
    const agentIds = withAgent.prospects.map((p) => p.brand.entityId);
    expect(agentIds).not.toEqual(baselineIds);
    expect(agentIds[0]).not.toBe(baselineIds[0]);

    expect(withAgent.prospectRankingDiff).toBeDefined();
    expect(withAgent.prospectRankingDiff?.unchanged).toBe(false);
    expect(withAgent.prospectRankingDiff?.summaryLines.length).toBeGreaterThan(0);
    expect(withAgent.prospectRankingDiff?.summaryLines[0]).not.toMatch(/—/);

    const fullRunQlooCalls = runQloo.getLogicalCallCount();
    expect(fullRunQlooCalls).toBeLessThanOrEqual(baselineQlooCalls + 1);

    console.log(
      JSON.stringify({
        qlooLogicalCalls: {
          baselineAnalyzeOnly: baselineQlooCalls,
          plannerPlusDag: fullRunQlooCalls,
          delta: fullRunQlooCalls - baselineQlooCalls,
        },
        excludedByPlanner: [...(plan.dagHooks.excludeProspectEntityIds ?? [])],
        prospectRankingDiff: withAgent.prospectRankingDiff,
      })
    );
  });
});
