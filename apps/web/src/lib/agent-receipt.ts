import type { ProspectingJob, ProspectingStep, ProspectingStepId } from '@leaseup/contracts';

export type AgentReceiptStepRow = {
  id: ProspectingStepId;
  label: string;
  dataSource: string;
  result: string;
  durationSec: string | null;
  reason?: string;
  status: ProspectingStep['status'];
};

/** Steps the server actually logged (never invent rows). */
export function loggedProspectingSteps(steps: ProspectingStep[]): ProspectingStep[] {
  return steps.filter((s) => s.status !== 'pending');
}

const DATA_SOURCE_BY_STEP: Record<ProspectingStepId, string> = {
  geocode: 'OpenStreetMap address lookup',
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

/** Plain broker copy for step summaries logged by the worker. */
export function plainProspectingStepResult(summary?: string): string {
  if (!summary?.trim()) return 'Finished';
  return summary
    .replace(/All The Places store data/gi, 'our store index')
    .replace(/All The Places/gi, 'our store index')
    .replace(/\bATP\b/g, 'store index')
    .replace(/\bOSM\b/g, 'OpenStreetMap')
    .replace(/\bQID\b/gi, 'brand id')
    .replace(/\bQloo\b/gi, 'taste data');
}

function formatDurationSec(durationMs?: number): string | null {
  if (durationMs === undefined || !Number.isFinite(durationMs)) return null;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

export function buildAgentReceiptRows(job: ProspectingJob): AgentReceiptStepRow[] {
  return loggedProspectingSteps(job.steps).map((step) => ({
    id: step.id,
    label: step.label,
    dataSource: prospectingStepDataSource(step.id),
    result:
      step.status === 'error'
        ? plainProspectingStepResult(step.summary) || 'Step failed'
        : plainProspectingStepResult(step.summary),
    durationSec: formatDurationSec(step.durationMs),
    reason: step.reason?.trim() ? plainProspectingStepResult(step.reason) : undefined,
    status: step.status,
  }));
}

export type AgentReceiptExport = {
  jobId: string;
  completedAt: string;
  address: string;
  mode: ProspectingJob['mode'];
  pitchId?: string;
  analysisRunId?: string;
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
    steps: buildAgentReceiptRows(job),
  };
}

export function agentReceiptJson(job: ProspectingJob): string {
  return JSON.stringify(agentReceiptExport(job), null, 2);
}

export function agentReceiptMarkdown(job: ProspectingJob): string {
  const rows = buildAgentReceiptRows(job);
  const lines: string[] = [
    '# Agent receipt',
    '',
    `Job: ${job.id}`,
    `Address: ${job.input.address}`,
    `Mode: ${job.mode}`,
  ];
  if (job.pitchId) lines.push(`Pitch pack: ${job.pitchId}`);
  if (job.analysisRunId) lines.push(`Analysis run: ${job.analysisRunId}`);
  lines.push('', '## Steps', '');
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
