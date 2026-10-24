import { describe, expect, it } from 'vitest';
import type { ProspectingStep } from '@leaseup/contracts';
import {
  agentReceiptJson,
  agentReceiptMarkdown,
  buildPipelineReceiptRows,
  buildPlannerReceiptSection,
  buildPlannerUnavailableLine,
  loggedProspectingSteps,
  parseAgentToolDecisions,
  plainProspectingStepResult,
} from '../lib/agent-receipt';
import { DEMO_PROSPECTING_RECEIPT_JOB } from '../lib/demo-prospecting-receipt-fixture';
import { LIVE_AGENT_PLAN_STEP } from './live-prospecting-receipt.fixture';
import { findBrokerJargonViolations } from '../lib/broker-visible-jargon';

describe('agent receipt', () => {
  it('includes only logged steps, not pending placeholders', () => {
    const steps: ProspectingStep[] = [
      { id: 'geocode', label: 'Geocode', status: 'complete', summary: 'Done' },
      { id: 'taste', label: 'Taste', status: 'pending' },
    ];
    expect(loggedProspectingSteps(steps)).toHaveLength(1);
    expect(buildPipelineReceiptRows({ ...DEMO_PROSPECTING_RECEIPT_JOB, steps })).toHaveLength(1);
  });

  it('plainifies worker summaries with store index wording', () => {
    expect(
      plainProspectingStepResult('OpenStreetMap unavailable; All The Places store data only')
    ).toBe('OpenStreetMap unavailable; our store index only');
  });

  it('puts planner decisions in their own section', () => {
    const planner = buildPlannerReceiptSection(DEMO_PROSPECTING_RECEIPT_JOB);
    expect(planner.decisions).toHaveLength(2);
    expect(planner.decisions[0]?.plannerLabel).toBe('Rule');
    expect(planner.fallbackLine).toBeNull();
    expect(planner.rankingImpactHeading).toBe('What the agent changed');
    const pipeline = buildPipelineReceiptRows(DEMO_PROSPECTING_RECEIPT_JOB);
    expect(pipeline.find((r) => r.id === 'agent_plan')).toBeUndefined();
    expect(pipeline.some((r) => r.label === 'Check stores in two directories')).toBe(true);
  });

  it('uses fallbackReason in the planner unavailable line', () => {
    expect(buildPlannerUnavailableLine({ fallbackReason: 'no_planner' })).toContain(
      'planner was not available on this server'
    );
    expect(buildPlannerUnavailableLine({ fallbackReason: 'OpenAI timeout' })).toContain('OpenAI timeout');
  });

  it('reads plannerMode when mode is omitted (worker detail parity)', () => {
    const planner = buildPlannerReceiptSection({
      ...DEMO_PROSPECTING_RECEIPT_JOB,
      steps: DEMO_PROSPECTING_RECEIPT_JOB.steps.map((s) =>
        s.id === 'agent_plan'
          ? {
              ...s,
              detail: {
                plannerMode: 'dag_fallback',
                fallbackReason: 'no_planner',
                agentSteps: [],
              },
            }
          : s
      ),
    });
    expect(planner.fallbackLine).toContain('planner was not available on this server');
  });

  it('sanitizes live planner result summaries (no UUIDs or raw tool ids)', () => {
    const decisions = parseAgentToolDecisions(LIVE_AGENT_PLAN_STEP);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.resultSummary).not.toMatch(/2C5054E1/i);
    expect(decisions[0]?.resultSummary).toMatch(/audience overlap/i);
    expect(decisions[0]?.tool).toBe('site context');
    const json = agentReceiptJson({
      ...DEMO_PROSPECTING_RECEIPT_JOB,
      steps: [LIVE_AGENT_PLAN_STEP, ...DEMO_PROSPECTING_RECEIPT_JOB.steps.filter((s) => s.id !== 'agent_plan')],
    });
    expect(json).toContain('2C5054E1-8691-4F52-83CD-310D029BA6A3');
    expect(json).toContain('enrich_site_stratum');
  });

  it('shows ranking impact lines from prospectRankingDiff on agent_plan detail', () => {
    const job = {
      ...DEMO_PROSPECTING_RECEIPT_JOB,
      steps: DEMO_PROSPECTING_RECEIPT_JOB.steps.map((s) =>
        s.id === 'agent_plan'
          ? {
              ...s,
              detail: {
                ...s.detail,
                prospectRankingDiff: {
                  unchanged: false,
                  baselineTopEntityIds: ['aaa'],
                  agentTopEntityIds: ['bbb'],
                  changes: [],
                  summaryLines: ['Moved Sample Brand from spot 1 to spot 2.'],
                },
              },
            }
          : s
      ),
    };
    const planner = buildPlannerReceiptSection(job);
    expect(planner.rankingImpactLines[0]).toContain('Moved Sample Brand');
  });

  it('shows planner fallback when agent plan has no tool steps', () => {
    const job = {
      ...DEMO_PROSPECTING_RECEIPT_JOB,
      steps: DEMO_PROSPECTING_RECEIPT_JOB.steps.map((s) =>
        s.id === 'agent_plan'
          ? {
              ...s,
              detail: {
                mode: 'dag_fallback',
                plannerMode: 'dag_fallback',
                fallbackReason: 'no_planner',
                agentSteps: [],
              },
            }
          : s
      ),
    };
    const planner = buildPlannerReceiptSection(job);
    expect(planner.decisions).toHaveLength(0);
    expect(planner.fallbackLine).toContain('planner was not available on this server');
  });

  it('exports JSON and Markdown with planner and run sections', () => {
    const job = DEMO_PROSPECTING_RECEIPT_JOB;
    const parsed = JSON.parse(agentReceiptJson(job)) as {
      planner: { decisions: unknown[] };
      steps: unknown[];
    };
    expect(parsed.planner.decisions).toHaveLength(2);
    expect(parsed.steps).toHaveLength(8);
    const md = agentReceiptMarkdown(job);
    expect(md).toContain('## Planner decisions');
    expect(md).toContain('- Rule: fetch affinity panel before absence scan.');
    expect(md).toContain('## Run steps');
    expect(md).toContain('### Check stores in two directories');
  });

  it('parses agentSteps planner kinds from the agent_plan step', () => {
    const plan = DEMO_PROSPECTING_RECEIPT_JOB.steps.find((s) => s.id === 'agent_plan')!;
    const decisions = parseAgentToolDecisions(plan);
    expect(decisions).toHaveLength(2);
    expect(decisions[1]?.plannerLabel).toBe('Agent');
  });

  it('receipt copy avoids broker jargon patterns', () => {
    const job = DEMO_PROSPECTING_RECEIPT_JOB;
    const planner = buildPlannerReceiptSection(job);
    const rows = buildPipelineReceiptRows(job);
    const blob = [
      ...planner.decisions.map((d) => `${d.reason} ${d.resultSummary}`),
      ...rows.map((r) => `${r.label} ${r.dataSource} ${r.result}`),
    ].join('\n');
    expect(findBrokerJargonViolations(blob)).toEqual([]);
    expect(blob).not.toMatch(/\bATP\b/);
    expect(blob).not.toMatch(/\bQID\b/i);
    expect(blob).not.toMatch(/P@10/);
    expect(blob).not.toMatch(/41\.909/);
  });
});
