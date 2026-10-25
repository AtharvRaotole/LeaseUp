import { useMemo } from 'react';
import type { ProspectingJob } from '@leaseup/contracts';
import { buildReviewReceiptSection } from '../../lib/agent-receipt';

/**
 * What the post-ranking review decided, shown above the receipt so a reorder (or a reasoned
 * decision to keep the order) is visible without opening the log. Renders nothing when the
 * review made no decision, so it never implies a change that did not happen.
 */
export function ReviewDecisionCallout({ job }: { job: ProspectingJob }) {
  const review = useMemo(() => buildReviewReceiptSection(job), [job]);
  if (!review) return null;
  const decisions = review.actions.filter((a) => a.outcome === 'lifted' || a.outcome === 'declined');
  if (!review.changed && decisions.length === 0) return null;
  const who = review.plannerLabel === 'Agent' ? 'Agent review (gpt-4o-mini)' : 'Rule review';
  const title = review.changed ? `${who} changed the top 5` : `${who} kept the top 5`;
  return (
    <section
      className="mt-8 rounded-card border border-accent/30 bg-surface p-4 sm:p-5"
      data-testid="review-decision-callout"
    >
      <p className="font-medium text-ink">{title}</p>
      <ul className="mt-2 space-y-2">
        {decisions.map((d, index) => (
          <li key={`decision-${index}`} className="text-sm text-ink-2 break-words">
            <span className="font-medium text-ink">{d.resultSummary}</span>
            {d.reason && <span> Why: {d.reason}</span>}
          </li>
        ))}
      </ul>
      {review.changed && (
        <p className="mt-3 text-xs text-ink-3 break-words" data-testid="review-decision-after">
          Top 5 now: {review.after.join(', ')}. Before review: {review.before.join(', ')}.
        </p>
      )}
    </section>
  );
}
