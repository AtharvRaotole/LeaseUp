import type { ProspectingJob, ProspectingStep, ProspectingStepId } from '@leaseup/contracts';
import {
  plainPlannerToolId,
  plainProspectingStepResult,
  receiptStepLabel,
  receiptStepResult,
  sanitizePlannerReasonText,
  sanitizePlannerResultSummary,
  sortPipelineReceiptSteps,
} from './prospecting-receipt-copy';

export { plainProspectingStepResult } from './prospecting-receipt-copy';

export type AgentReceiptToolDecision = {
  plannerLabel: 'Rule' | 'Agent';
  reason: string;
  tool: string;
  resultSummary: string;
};

export type AgentReceiptStepRow = {
  id: ProspectingStepId;
  label: string;
  dataSource: string;
  result: string;
  durationSec: string | null;
  reason?: string;
  status: ProspectingStep['status'];
};

export type PlannerReceiptSection = {
  decisions: AgentReceiptToolDecision[];
  fallbackLine: string | null;
  planSummary: string | null;
};

export const PLANNER_UNAVAILABLE_LINE = 'Planner unavailable, used the standard steps.';

/** Steps the server actually logged (never invent rows). */
export function loggedProspectingSteps(steps: ProspectingStep[]): ProspectingStep[] {
  return steps.filter((s) => s.status !== 'pending');
}

const DATA_SOURCE_BY_STEP: Record<ProspectingStepId, string> = {
  geocode: 'OpenStreetMap address lookup',
  agent_plan: 'Site planner (tool calls)',
  taste: 'Neighborhood taste data',
  scan_stores: 'Chain store index',
  verify_osm: 'Store index and OpenStreetMap map layer',
  rank_backtest: 'Ranking and backtest',
  explain_top5: 'Prospect notes from this run',
  draft_outreach: 'Draft email writer',
  pitch_pack: 'Pitch pack builder',
};

export function prospectingStepDataSource(id: ProspectingStepId): string {
  return DATA_SOURCE_BY_STEP[id];
}

function formatDurationSec(durationMs?: number): string | null {
  if (durationMs === undefined || !Number.isFinite(durationMs)) return null;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function receiptToolReason(plannerLabel: 'Rule' | 'Agent', raw: string): string {
  let plain = sanitizePlannerReasonText(raw);
  if (plannerLabel === 'Rule' && /^rule:\s*/i.test(plain)) {
    plain = plain.replace(/^rule:\s*/i, '').trim();
  }
  if (plannerLabel === 'Agent' && /^agent:\s*/i.test(plain)) {
    plain = plain.replace(/^agent:\s*/i, '').trim();
  }
  return plain;
}

export function parseAgentToolDecisions(step: ProspectingStep): AgentReceiptToolDecision[] {
  if (step.id !== 'agent_plan' || !step.detail || typeof step.detail !== 'object') return [];
  const raw = (step.detail as { agentSteps?: unknown }).agentSteps;
  if (!Array.isArray(raw)) return [];

  const decisions: AgentReceiptToolDecision[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const plannerLabel: 'Rule' | 'Agent' = row.planner === 'model' ? 'Agent' : 'Rule';
    const reason = receiptToolReason(plannerLabel, String(row.reason ?? ''));
    const resultSummary = sanitizePlannerResultSummary(String(row.resultSummary ?? ''));
    const tool = plainPlannerToolId(String(row.tool ?? '').trim());
    if (!reason && !resultSummary) continue;
    decisions.push({ plannerLabel, reason, tool, resultSummary });
  }
  return decisions;
}

function agentPlanDetail(job: ProspectingJob): Record<string, unknown> | undefined {
  const step = job.steps.find((s) => s.id === 'agent_plan');
  if (!step?.detail || typeof step.detail !== 'object') return undefined;
  return step.detail as Record<string, unknown>;
}

function plannerDetailMode(detail?: Record<string, unknown>): string | undefined {
  const mode = detail?.plannerMode ?? detail?.mode;
  return typeof mode === 'string' ? mode : undefined;
}

export function buildPlannerUnavailableLine(detail?: Record<string, unknown>): string {
  const reason = detail?.fallbackReason;
  if (typeof reason === 'string' && reason.trim()) {
    const human =
      reason.trim() === 'no_planner'
        ? 'the planner was not available on this server'
        : sanitizePlannerReasonText(reason.trim());
    return `Planner unavailable (${human}). Used the standard steps.`;
  }
  return PLANNER_UNAVAILABLE_LINE;
}

export function buildPlannerReceiptSection(job: ProspectingJob): PlannerReceiptSection {
  const planStep = job.steps.find((s) => s.id === 'agent_plan');
  if (!planStep || planStep.status === 'pending') {
    return { decisions: [], fallbackLine: buildPlannerUnavailableLine(), planSummary: null };
  }

  const detail = agentPlanDetail(job);
  const mode = plannerDetailMode(detail);
  const isFallback = mode === 'dag_fallback' || Boolean(detail?.fallbackReason);
  const decisions = parseAgentToolDecisions(planStep);
  const unavailableLine = buildPlannerUnavailableLine(detail);

  if (decisions.length === 0) {
    return {
      decisions: [],
      fallbackLine: unavailableLine,
      planSummary: plainProspectingStepResult(planStep.summary) || null,
    };
  }

  return {
    decisions,
    fallbackLine: isFallback ? unavailableLine : null,
    planSummary: plainProspectingStepResult(planStep.summary) || null,
  };
}

function buildPipelineStepRow(step: ProspectingStep, job: ProspectingJob): AgentReceiptStepRow {
  return {
    id: step.id,
    label: receiptStepLabel(step),
    dataSource: prospectingStepDataSource(step.id),
    result:
      step.status === 'error'
        ? receiptStepResult(step, job) || 'Step failed'
        : receiptStepResult(step, job),
    durationSec: formatDurationSec(step.durationMs),
    reason: step.reason?.trim() ? plainProspectingStepResult(step.reason) : undefined,
    status: step.status,
  };
}

export function buildPipelineReceiptRows(job: ProspectingJob): AgentReceiptStepRow[] {
  const pipeline = loggedProspectingSteps(job.steps).filter((s) => s.id !== 'agent_plan');
  return sortPipelineReceiptSteps(pipeline).map((step) => buildPipelineStepRow(step, job));
}

/** @deprecated Use buildPipelineReceiptRows; kept for tests migrating off combined list. */
export function buildAgentReceiptRows(job: ProspectingJob): AgentReceiptStepRow[] {
  return buildPipelineReceiptRows(job);
}

export type AgentReceiptExport = {
  jobId: string;
  completedAt: string;
  address: string;
  mode: ProspectingJob['mode'];
  pitchId?: string;
  analysisRunId?: string;
  planner: PlannerReceiptSection;
  steps: AgentReceiptStepRow[];
};

export function agentReceiptExport(job: ProspectingJob): AgentReceiptExport {
  return {
    jobId: job.id,
    completedAt: job.createdAt,
    address: job.input.address,
    mode: job.mode,
    pitchId: job.pitchId,
    analysisRunId: job.analysisRunId,
    planner: buildPlannerReceiptSection(job),
    steps: buildPipelineReceiptRows(job),
  };
}

export function agentReceiptJson(job: ProspectingJob): string {
  const planStep = job.steps.find((s) => s.id === 'agent_plan');
  return JSON.stringify(
    {
      ...agentReceiptExport(job),
      raw: {
        agentPlanDetail: planStep?.detail ?? null,
        steps: job.steps,
      },
    },
    null,
    2
  );
}

export function agentReceiptMarkdown(job: ProspectingJob): string {
  const planner = buildPlannerReceiptSection(job);
  const rows = buildPipelineReceiptRows(job);
  const lines: string[] = [
    '# Agent receipt',
    '',
    `Job: ${job.id}`,
    `Address: ${job.input.address}`,
    `Mode: ${job.mode}`,
  ];
  if (job.pitchId) lines.push(`Pitch pack: ${job.pitchId}`);
  if (job.analysisRunId) lines.push(`Analysis run: ${job.analysisRunId}`);
  lines.push('', '## Planner decisions', '');
  if (planner.fallbackLine) lines.push(planner.fallbackLine);
  if (planner.planSummary) lines.push(planner.planSummary);
  for (const tool of planner.decisions) {
    lines.push(`- ${tool.plannerLabel}: ${tool.reason}`);
    if (tool.resultSummary) lines.push(`  - Result: ${tool.resultSummary}`);
  }
  lines.push('', '## Run steps', '');
  for (const row of rows) {
    lines.push(`### ${row.label}`);
    lines.push(`- Source: ${row.dataSource}`);
    lines.push(`- Result: ${row.result}`);
    if (row.durationSec) lines.push(`- Time: ${row.durationSec}`);
    if (row.reason) lines.push(`- Why: ${row.reason}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

export function downloadAgentReceiptFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
