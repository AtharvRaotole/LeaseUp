import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ProspectingJob } from '@leaseup/contracts';
import { ReviewDecisionCallout } from '../components/prospecting/ReviewDecisionCallout';
import { agentReceiptMarkdown, buildReviewReceiptSection } from '../lib/agent-receipt';
import { DEMO_PROSPECTING_RECEIPT_JOB } from '../lib/demo-prospecting-receipt-fixture';

const names = (xs: string[]) => xs.map((name, i) => ({ entityId: `id-${i}`, name }));
const TOP = ['Ulta', 'HomeGoods', "Victoria's Secret", 'H&M', 'Vans'];

function withReview(review: Record<string, unknown>): ProspectingJob {
  return {
    ...DEMO_PROSPECTING_RECEIPT_JOB,
    steps: DEMO_PROSPECTING_RECEIPT_JOB.steps.map((st) =>
      st.id === 'agent_plan'
        ? { ...st, detail: { ...(st.detail as object), review: { before: names(TOP), ...review } } }
        : st
    ),
  } as ProspectingJob;
}

describe('review decision callout', () => {
  it('shows a model lift with its reason and the new top 5', () => {
    const job = withReview({
      planner: 'model',
      changed: true,
      summary: 'Review changed the top 5 with 1 evidence-backed lift.',
      after: names(['Ulta', 'HomeGoods', 'H&M', "Victoria's Secret", 'Vans']),
      actions: [
        {
          planner: 'model',
          tool: 'lift_pitch',
          outcome: 'lifted',
          reason: 'H&M shares a local Qloo audience; Victoria\'s Secret was checked and shares none.',
          resultSummary: "H&M moved from #4 to #3 (1 verified local audience overlap); Victoria's Secret was checked and has none.",
        },
      ],
    });
    const html = renderToStaticMarkup(<ReviewDecisionCallout job={job} />).replace(/<!-- -->/g, '');
    expect(html).toContain('Agent review (gpt-4o-mini) changed the top 5');
    expect(html).toContain('H&amp;M moved from #4 to #3');
    expect(html).toContain('Why: H&amp;M shares a local');
    expect(html).toContain('Top 5 now: Ulta, HomeGoods, H&amp;M');
  });

  it('shows a reasoned decline as a kept order, and the receipt logs the decision', () => {
    const job = withReview({
      planner: 'model',
      changed: false,
      summary: 'Review kept the ranked top 5 (1 eligible lift declined with a reason).',
      after: names(TOP),
      actions: [
        {
          planner: 'model',
          tool: 'decline_lift',
          outcome: 'declined',
          reason: 'One overlap is thin evidence against a stronger taste match.',
          resultSummary: "Kept Victoria's Secret above H&M.",
        },
      ],
    });
    expect(buildReviewReceiptSection(job)!.actions[0]!.outcome).toBe('declined');
    const html = renderToStaticMarkup(<ReviewDecisionCallout job={job} />).replace(/<!-- -->/g, '');
    expect(html).toContain('Agent review (gpt-4o-mini) kept the top 5');
    expect(html).not.toContain('Top 5 now');
    expect(agentReceiptMarkdown(job)).toContain("  - Decision: Kept Victoria's Secret above H&M.");
  });

  it('renders nothing when the review made no decision', () => {
    const job = withReview({
      planner: 'model',
      changed: false,
      summary: 'Review kept the ranked top 5: no lift passes the evidence check.',
      after: names(TOP),
      actions: [],
    });
    expect(renderToStaticMarkup(<ReviewDecisionCallout job={job} />)).toBe('');
  });
});
