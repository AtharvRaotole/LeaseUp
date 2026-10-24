import type { ProspectPack } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import type { ProspectingAgentDagHooks, ProspectingAgentStepLog } from './prospecting-agent-state';

export type ProspectRankingChangeKind = 'added' | 'removed' | 'moved';

export type ProspectRankingChange = {
  kind: ProspectRankingChangeKind;
  entityId: string;
  brandName: string;
  fromRank?: number;
  toRank?: number;
  plannerStepIndex?: number;
  plannerTool?: string;
  plannerReason?: string;
};

export type AgentProspectRankingDiff = {
  unchanged: boolean;
  baselineTopEntityIds: string[];
  agentTopEntityIds: string[];
  changes: ProspectRankingChange[];
  /** Plain broker copy for the receipt (no em dashes). */
  summaryLines: string[];
};

const TOP_N = 5;

function rankMap(ids: string[]): Map<string, number> {
  const map = new Map<string, number>();
  ids.forEach((id, i) => map.set(id, i + 1));
  return map;
}

function findPlannerCause(
  entityId: string,
  kind: ProspectRankingChangeKind,
  steps: ProspectingAgentStepLog[],
  hooks: ProspectingAgentDagHooks
): Pick<ProspectRankingChange, 'plannerStepIndex' | 'plannerTool' | 'plannerReason'> {
  if (kind === 'removed' && hooks.excludeProspectEntityIds?.has(entityId)) {
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i]!;
      if (step.tool !== 'nearest_store_check' && step.tool !== 'store_presence_lookup') continue;
      const argId = String(step.toolArgs?.entityId ?? '');
      if (argId.toUpperCase() === entityId.toUpperCase()) {
        return { plannerStepIndex: step.stepIndex, plannerTool: step.tool, plannerReason: step.reason };
      }
    }
    const fallback = steps.find(
      (s) =>
        s.tool === 'nearest_store_check' ||
        s.tool === 'store_presence_lookup' ||
        s.tool === 'verify_top_prospects_nearest_store'
    );
    if (fallback) {
      return {
        plannerStepIndex: fallback.stepIndex,
        plannerTool: fallback.tool,
        plannerReason: fallback.reason,
      };
    }
  }
  if (kind === 'moved' && hooks.stratumBoostEntityIds?.has(entityId)) {
    const boost = steps.find((s) => s.tool === 'enrich_site_stratum');
    if (boost) {
      return {
        plannerStepIndex: boost.stepIndex,
        plannerTool: boost.tool,
        plannerReason: boost.reason,
      };
    }
  }
  if (kind === 'added') {
    const exclusion = steps.find(
      (s) =>
        (s.tool === 'nearest_store_check' || s.tool === 'store_presence_lookup') &&
        hooks.excludeProspectEntityIds?.size
    );
    if (exclusion) {
      return {
        plannerStepIndex: exclusion.stepIndex,
        plannerTool: exclusion.tool,
        plannerReason: exclusion.reason,
      };
    }
  }
  return {};
}

function plainChangeLine(change: ProspectRankingChange): string {
  const name = change.brandName;
  const because = change.plannerReason
    ? ` because the planner ${sanitizeBecause(change.plannerReason)}`
    : '';
  if (change.kind === 'removed' && change.fromRank) {
    return `Dropped ${name} from pitch spot ${change.fromRank}${because}.`;
  }
  if (change.kind === 'added' && change.toRank) {
    return `Added ${name} at pitch spot ${change.toRank}${because}.`;
  }
  if (change.kind === 'moved' && change.fromRank && change.toRank) {
    return `Moved ${name} from spot ${change.fromRank} to spot ${change.toRank}${because}.`;
  }
  return `Updated ${name} on the pitch list${because}.`;
}

function sanitizeBecause(reason: string): string {
  let text = reason.replace(/^rule:\s*/i, '').replace(/^agent:\s*/i, '').trim();
  if (!text.endsWith('.')) text += '.';
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function computeAgentProspectRankingDiff(params: {
  baselinePacks: ProspectPack[];
  agentPacks: ProspectPack[];
  plannerSteps: ProspectingAgentStepLog[];
  dagHooks: ProspectingAgentDagHooks;
}): AgentProspectRankingDiff {
  const baselineTopEntityIds = params.baselinePacks.slice(0, TOP_N).map((p) => p.brand.entityId);
  const agentTopEntityIds = params.agentPacks.slice(0, TOP_N).map((p) => p.brand.entityId);
  const baselineRank = rankMap(baselineTopEntityIds);
  const agentRank = rankMap(agentTopEntityIds);
  const allIds = new Set([...baselineTopEntityIds, ...agentTopEntityIds]);

  const changes: ProspectRankingChange[] = [];
  for (const entityId of allIds) {
    const inBase = baselineRank.has(entityId);
    const inAgent = agentRank.has(entityId);
    const brandName =
      params.agentPacks.find((p) => p.brand.entityId === entityId)?.brand.name ??
      params.baselinePacks.find((p) => p.brand.entityId === entityId)?.brand.name ??
      displayBrandName(entityId, entityId);

    let kind: ProspectRankingChangeKind;
    if (inBase && !inAgent) kind = 'removed';
    else if (!inBase && inAgent) kind = 'added';
    else if (inBase && inAgent && baselineRank.get(entityId) !== agentRank.get(entityId)) {
      kind = 'moved';
    } else {
      continue;
    }

    const cause = findPlannerCause(entityId, kind, params.plannerSteps, params.dagHooks);
    changes.push({
      kind,
      entityId,
      brandName,
      fromRank: baselineRank.get(entityId),
      toRank: agentRank.get(entityId),
      ...cause,
    });
  }

  changes.sort((a, b) => (a.toRank ?? a.fromRank ?? 99) - (b.toRank ?? b.fromRank ?? 99));

  const unchanged =
    baselineTopEntityIds.length === agentTopEntityIds.length &&
    baselineTopEntityIds.every((id, i) => id === agentTopEntityIds[i]);

  const summaryLines = unchanged
    ? ['The agent kept the standard ranking.']
    : changes.map(plainChangeLine);

  return {
    unchanged,
    baselineTopEntityIds,
    agentTopEntityIds,
    changes,
    summaryLines,
  };
}
