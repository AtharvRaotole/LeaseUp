import { describe, expect, it } from 'vitest';
import type { ProspectingStep } from '@leaseup/contracts';
import {
  agentReceiptJson,
  agentReceiptMarkdown,
  buildPipelineReceiptRows,
  buildPlannerReceiptSection,
  buildPlannerUnavailableLine,
  buildReviewReceiptSection,
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

  it('shows the post-ranking review with before and after top 5', () => {
    const plan = DEMO_PROSPECTING_RECEIPT_JOB.steps.find((st) => st.id === 'agent_plan')!;
    const names = (xs: string[]) => xs.map((name, i) => ({ entityId: `id-${i}`, name }));
    const job = {
      ...DEMO_PROSPECTING_RECEIPT_JOB,
      steps: DEMO_PROSPECTING_RECEIPT_JOB.steps.map((st) =>
        st.id === 'agent_plan'
          ? {
              ...plan,
              detail: {
                ...(plan.detail as object),
                review: {
                  planner: 'rule',
                  changed: true,
                  summary: 'Review changed the top 5 with 1 evidence-backed lift.',
                  before: names(['TJ Maxx', "Victoria's Secret", 'J.Crew', 'H&M', 'Vans']),
                  after: names(['TJ Maxx', 'Vans', "Victoria's Secret", 'J.Crew', 'H&M']),
                  actions: [
                    {
                      planner: 'rule',
                      tool: 'lift_pitch',
                      outcome: 'lifted',
                      reason:
                        "Rule: put a pitch with local audience evidence (Vans) ahead of one without (Victoria's Secret).",
                      resultSummary:
                        "Vans moved from #5 to #2 (2 verified local audience overlaps); Victoria's Secret has none.",
                    },
                  ],
                  modelUsage: { calls: 2, promptTokens: 900, completionTokens: 120 },
                  outcome: {
                    standardTop5: names(['TJ Maxx', "Victoria's Secret", 'J.Crew', 'H&M', 'Vans']),
                    finalTop5: names(['TJ Maxx', 'Vans', "Victoria's Secret", 'J.Crew', 'H&M']),
                    top3Changed: true,
                    top5Changed: true,
                    enteredTop5: [],
                    leftTop5: [],
                    summary: "Changed vs the standard ranking: Vans #5 to #2; Victoria's Secret #2 to #3.",
                  },
                },
              },
            }
          : st
      ),
    };
    const review = buildReviewReceiptSection(job)!;
    expect(review.standard[4]).toBe('Vans');
    expect(review.outcomeLine).toBe("Changed vs the standard ranking: Vans #5 to #2; Victoria's Secret #2 to #3.");
    expect(review.usageLine).toBe('Model review used 2 gpt-4o-mini calls, 1,020 tokens.');
    expect(review.plannerLabel).toBe('Rule');
    expect(review.actions[0]?.reason).toBe(
      "put a pitch with local audience evidence (Vans) ahead of one without (Victoria's Secret)."
    );
    expect(review.after[1]).toBe('Vans');
    const md = agentReceiptMarkdown(job);
    expect(md).toContain('## Review after ranking');
    expect(md).toContain("Top 5 before review: TJ Maxx, Victoria's Secret, J.Crew, H&M, Vans");
    expect(md).toContain("Top 5 after review: TJ Maxx, Vans, Victoria's Secret, J.Crew, H&M");
    expect(md).toContain("Top 5, standard ranking: TJ Maxx, Victoria's Secret, J.Crew, H&M, Vans");
    expect(md).toContain('Changed vs the standard ranking: Vans #5 to #2');
    expect(JSON.parse(agentReceiptJson(job)).review.changed).toBe(true);
    expect(JSON.parse(agentReceiptJson(job)).raw.agentPlanDetail.review.outcome.top3Changed).toBe(true);
  });

  it('omits the review section on older runs without review detail', () => {
    expect(buildReviewReceiptSection(DEMO_PROSPECTING_RECEIPT_JOB)).toBeNull();
    expect(agentReceiptMarkdown(DEMO_PROSPECTING_RECEIPT_JOB)).not.toContain('Review after ranking');
  });

  it('keeps rule planner reasons readable after sanitizing', () => {
    const job = {
      ...DEMO_PROSPECTING_RECEIPT_JOB,
      steps: [
        {
          id: 'agent_plan' as const,
          label: 'Plan site checks',
          status: 'complete' as const,
          detail: {
            mode: 'agent',
            agentSteps: [
              {
                planner: 'rule',
                tool: 'nearest_store_check',
                reason: 'Rule: reconcile the nearest store for the strongest taste match.',
                resultSummary: 'Nearest Whole Foods Market store 2.01 km.',
              },
            ],
          },
        },
      ],
    };
    expect(buildPlannerReceiptSection(job).decisions[0]?.reason).toBe(
      'reconcile the nearest store for the strongest taste match.'
    );
  });
});
