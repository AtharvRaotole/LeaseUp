import type { Location } from '@leaseup/contracts';
import type { Env } from '../index';
import { createStoreCatalog } from '../services/store-catalog';
import { shortlistProspectEntityIds } from './prospecting-prospect-shortlist';
import {
  absenceRadiusKmForLocation,
  applyProspectingAgentToolToState,
  type ProspectingAgentAccumulatedState,
  type ProspectingAgentStepLog,
} from './prospecting-agent-state';
import {
  executeProspectingAgentTool,
  type ProspectingAgentToolContext,
} from './prospecting-agent-tools';
import type { QlooClient } from '../providers/qloo';
import { demoFixtureStratum, matchDemoFixtureId } from '@leaseup/fixtures/worker';
import { PROSPECTING_AGENT_MAX_STEPS } from './analysis-step-budget';

const LIVE_TOP_VERIFY_REASON =
  'Agent: confirm top pitch prospects have no confirmed store inside the absence radius before outreach.';

export async function runLiveTopProspectNearestStoreChecks(params: {
  env: Env;
  location: Location;
  radiusKm: number;
  runId: string;
  qloo: QlooClient;
  state: ProspectingAgentAccumulatedState;
  steps: ProspectingAgentStepLog[];
  plannerKind: 'model' | 'rule';
}): Promise<void> {
  if (params.env.APP_MODE !== 'live' || params.plannerKind !== 'model') return;
  if (!params.state.insights?.length) return;

  const catalog = createStoreCatalog(params.env, 'live');
  const topIds = await shortlistProspectEntityIds({
    location: params.location,
    insights: params.state.insights,
    radiusKm: params.radiusKm,
    catalog,
    limit: 3,
    agentDagHooks: {
      excludeProspectEntityIds: params.state.excludeProspectEntityIds,
      stratumBoostEntityIds: params.state.stratumBoostEntityIds,
    },
  });

  const fixtureId = matchDemoFixtureId(params.location.address);
  const siteStratum = fixtureId ? demoFixtureStratum(fixtureId) : 'urban';
  const absenceRadiusKm = absenceRadiusKmForLocation(
    params.location.address,
    params.radiusKm,
    siteStratum
  );

  const ctx: ProspectingAgentToolContext = {
    env: params.env,
    location: params.location,
    radiusKm: params.radiusKm,
    runId: params.runId,
    qloo: params.qloo,
    mode: 'live',
    state: params.state,
    lastInsights: params.state.insights,
  };

  for (const entityId of topIds) {
    if (params.steps.length >= PROSPECTING_AGENT_MAX_STEPS) break;
    if (params.state.excludeProspectEntityIds.has(entityId)) continue;

    const call = {
      name: 'nearest_store_check' as const,
      reason: LIVE_TOP_VERIFY_REASON,
      arguments: { entityId },
    };
    const t0 = Date.now();
    const result = await executeProspectingAgentTool(call, ctx);
    applyProspectingAgentToolToState(
      params.state,
      call,
      result,
      absenceRadiusKm,
      params.state.insights
    );
    params.steps.push({
      stepIndex: params.steps.length,
      planner: 'model',
      reason: call.reason,
      tool: call.name,
      toolArgs: { ...call.arguments, ...result.payload },
      resultSummary: result.summary,
      durationMs: Date.now() - t0,
    });
  }
}
