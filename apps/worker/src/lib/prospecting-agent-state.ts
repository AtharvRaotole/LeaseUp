import type { TradeAreaTasteContext } from '@leaseup/contracts';
import type { QlooInsight } from '../providers/qloo';
import { prospectAbsenceRadiusKm } from '@leaseup/fixtures/worker';
import type { EvalDensityStratum } from '@leaseup/fixtures/worker';
import type { ProspectingAgentToolCall, ProspectingAgentToolResult } from './prospecting-agent-tools';

export type ProspectingAgentPlannerKind = 'model' | 'rule';

export type ProspectingAgentStepLog = {
  stepIndex: number;
  planner: ProspectingAgentPlannerKind;
  reason: string;
  tool: string;
  toolArgs: Record<string, unknown>;
  resultSummary: string;
  durationMs: number;
};

export type ProspectingAgentAccumulatedState = {
  insights?: QlooInsight[];
  forceChainSizeRanking: boolean;
  excludeProspectEntityIds: Set<string>;
  stratumBoostEntityIds: Set<string>;
  preloadedTradeAreaTaste: Map<string, TradeAreaTasteContext>;
  plannerQlooCalls: number;
};

export type ProspectingAgentDagHooks = {
  seedBrandInsights?: QlooInsight[];
  forceChainSizeRanking?: boolean;
  excludeProspectEntityIds?: ReadonlySet<string>;
  stratumBoostEntityIds?: ReadonlySet<string>;
  preloadedTradeAreaTaste?: ReadonlyMap<string, TradeAreaTasteContext>;
};

export function createProspectingAgentState(): ProspectingAgentAccumulatedState {
  return {
    forceChainSizeRanking: false,
    excludeProspectEntityIds: new Set(),
    stratumBoostEntityIds: new Set(),
    preloadedTradeAreaTaste: new Map(),
    plannerQlooCalls: 0,
  };
}

export function toProspectingAgentDagHooks(
  state: ProspectingAgentAccumulatedState
): ProspectingAgentDagHooks {
  return {
    seedBrandInsights: state.insights,
    forceChainSizeRanking: state.forceChainSizeRanking || undefined,
    excludeProspectEntityIds: state.excludeProspectEntityIds.size
      ? state.excludeProspectEntityIds
      : undefined,
    stratumBoostEntityIds: state.stratumBoostEntityIds.size ? state.stratumBoostEntityIds : undefined,
    preloadedTradeAreaTaste: state.preloadedTradeAreaTaste.size
      ? state.preloadedTradeAreaTaste
      : undefined,
  };
}

export function applyProspectingAgentToolToState(
  state: ProspectingAgentAccumulatedState,
  call: ProspectingAgentToolCall,
  result: ProspectingAgentToolResult,
  absenceRadiusKm: number,
  insightsAfterTool?: QlooInsight[]
): void {
  state.plannerQlooCalls += result.qlooCalls;
  const payload = result.payload ?? {};

  switch (call.name) {
    case 'qloo_brand_insights':
    case 'chain_size_fallback':
      if (insightsAfterTool?.length) {
        state.insights = insightsAfterTool;
      }
      if (call.name === 'chain_size_fallback') {
        state.forceChainSizeRanking = true;
      }
      break;
    case 'nearest_store_check': {
      const entityId = String(payload.entityId ?? call.arguments.entityId ?? '');
      const km = payload.km as number | undefined;
      if (entityId && km !== undefined && km <= absenceRadiusKm + 0.05) {
        state.excludeProspectEntityIds.add(entityId);
      }
      break;
    }
    case 'store_presence_lookup': {
      const entityId = String(payload.entityId ?? call.arguments.entityId ?? '');
      const count = Number(payload.count ?? 0);
      const nearestKm = payload.nearestKm as number | undefined;
      const radiusKm = Number(call.arguments.radiusKm) || absenceRadiusKm;
      if (entityId && count > 0 && nearestKm !== undefined && nearestKm <= radiusKm + 0.05) {
        state.excludeProspectEntityIds.add(entityId);
      }
      break;
    }
    case 'enrich_site_stratum': {
      const entityId = String(payload.entityId ?? call.arguments.entityId ?? '');
      const audienceCount = Number(payload.audienceCount ?? 0);
      const taste = payload.tradeAreaTaste as TradeAreaTasteContext | undefined;
      if (entityId) {
        state.stratumBoostEntityIds.add(entityId);
        if (taste && audienceCount > 0) {
          state.preloadedTradeAreaTaste.set(entityId, taste);
        }
      }
      break;
    }
    default:
      break;
  }
}

export function absenceRadiusKmForLocation(
  address: string,
  radiusKm: number,
  siteStratum: EvalDensityStratum
): number {
  return prospectAbsenceRadiusKm(siteStratum, radiusKm);
}
