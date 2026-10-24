import type { ProspectingStep } from '@leaseup/contracts';

/** agent_plan step from production job 92dd9de5 (deploy34). */
export const LIVE_AGENT_PLAN_STEP: ProspectingStep = {
  id: 'agent_plan',
  label: 'Plan site checks (agent)',
  status: 'complete',
  durationMs: 7009,
  summary: 'Agent ran 3 tool step(s); 2 Qloo call(s); results feed analysis.',
  detail: {
    mode: 'agent',
    agentSteps: [
      {
        stepIndex: 2,
        planner: 'model',
        reason: 'To gather additional taste enrichment data for the site stratum in Brooklyn.',
        tool: 'enrich_site_stratum',
        toolArgs: {
          entityId: '2C5054E1-8691-4F52-83CD-310D029BA6A3',
          stratum: 'urban',
        },
        resultSummary:
          'Stratum urban: 2 verified local audience overlap(s) for brand 2C5054E1-8691-4F52-83CD-310D029BA6A3.',
        durationMs: 193,
      },
    ],
  },
};
