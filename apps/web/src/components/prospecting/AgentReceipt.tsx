import { useMemo, useState } from 'react';
import type { ProspectingJob } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import {
  agentReceiptJson,
  agentReceiptMarkdown,
  buildPipelineReceiptRows,
  buildPlannerReceiptSection,
  buildReviewReceiptSection,
  downloadAgentReceiptFile,
  loggedProspectingSteps,
} from '../../lib/agent-receipt';
import { cn } from '../../lib/cn';

export function AgentReceipt({ job }: { job: ProspectingJob }) {
  const planner = useMemo(() => buildPlannerReceiptSection(job), [job]);
  const review = useMemo(() => buildReviewReceiptSection(job), [job]);
  const rows = useMemo(() => buildPipelineReceiptRows(job), [job]);
  const loggedCount = loggedProspectingSteps(job.steps).length;
  const [open, setOpen] = useState(true);

  if (job.status !== 'complete' || loggedCount === 0) return null;

  const baseName = `leaseup-agent-receipt-${job.id.slice(0, 8)}`;

  return (
    <section
      className="mt-8 rounded-card border border-border bg-surface"
      data-testid="agent-receipt"
    >
      <button
        type="button"
        className="flex w-full min-h-12 items-center justify-between gap-3 px-3 py-3 text-left sm:px-5"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">Agent receipt</p>
          <p className="mt-0.5 text-sm text-ink-2 break-words">
            {loggedCount} logged step{loggedCount === 1 ? '' : 's'} from this run
          </p>
        </div>
        <span className="shrink-0 text-sm text-accent">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="border-t border-border px-3 pb-4 pt-3 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              data-testid="agent-receipt-download-json"
              onClick={() =>
                downloadAgentReceiptFile(`${baseName}.json`, agentReceiptJson(job), 'application/json')
              }
            >
              Download JSON
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              data-testid="agent-receipt-download-markdown"
              onClick={() =>
                downloadAgentReceiptFile(
                  `${baseName}.md`,
                  agentReceiptMarkdown(job),
                  'text/markdown'
                )
              }
            >
              Download Markdown
            </Button>
          </div>

          <div className="mt-5" data-testid="agent-receipt-planner">
            <h3 className="text-sm font-semibold text-ink">Planner decisions</h3>
            {planner.fallbackLine && (
              <p className="mt-2 text-sm text-ink-2 break-words" data-testid="agent-receipt-planner-fallback">
                {planner.fallbackLine}
              </p>
            )}
            {planner.planSummary && planner.decisions.length > 0 && (
              <p className="mt-2 text-xs text-ink-3 break-words">{planner.planSummary}</p>
            )}
            {planner.decisions.length > 0 && (
              <ul className="mt-3 space-y-2.5">
                {planner.decisions.map((decision, index) => (
                  <li
                    key={`planner-${index}`}
                    className="rounded-control border border-border bg-surface-2/40 px-3 py-2.5 sm:px-4"
                    data-testid={`agent-receipt-planner-decision-${index}`}
                  >
                    <p className="text-sm text-ink-2 break-words">
                      <span className="font-medium text-ink">{decision.plannerLabel}: </span>
                      {decision.reason}
                    </p>
                    {decision.resultSummary && (
                      <p className="mt-1 text-sm text-ink-2 break-words">
                        <span className="font-medium text-ink">Result: </span>
                        {decision.resultSummary}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {review && (
            <div className="mt-6" data-testid="agent-receipt-review">
              <h3 className="text-sm font-semibold text-ink">Review after ranking</h3>
              {review.fallbackLine && (
                <p className="mt-2 text-sm text-ink-2 break-words">{review.fallbackLine}</p>
              )}
              <p className="mt-2 text-sm text-ink-2 break-words" data-testid="agent-receipt-review-summary">
                {review.summary}
              </p>
              {review.usageLine && (
                <p className="mt-1 text-xs text-ink-3 break-words" data-testid="agent-receipt-review-usage">
                  {review.usageLine}
                </p>
              )}
              {review.actions.length > 0 && (
                <ul className="mt-3 space-y-2.5">
                  {review.actions.map((action, index) => (
                    <li
                      key={`review-${index}`}
                      className="rounded-control border border-border bg-surface-2/40 px-3 py-2.5 sm:px-4"
                      data-testid={`agent-receipt-review-action-${index}`}
                    >
                      <p className="text-sm text-ink-2 break-words">
                        <span className="font-medium text-ink">{action.plannerLabel}: </span>
                        {action.reason}
                      </p>
                      {action.resultSummary && (
                        <p className="mt-1 text-sm text-ink-2 break-words">
                          <span className="font-medium text-ink">
                            {action.outcome === 'lifted'
                              ? 'Result: '
                              : action.outcome === 'declined'
                                ? 'Decision: '
                                : 'Blocked: '}
                          </span>
                          {action.resultSummary}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {review.standard.length > 0 && (
                  <div
                    className="rounded-control border border-border px-3 py-2.5 sm:col-span-2"
                    data-testid="agent-receipt-review-standard"
                  >
                    <dt className="text-xs text-ink-3">Top 5, standard ranking (no planner, no review)</dt>
                    <dd className="mt-1 text-ink-2 break-words">{review.standard.join(', ')}</dd>
                  </div>
                )}
                <div
                  className="rounded-control border border-border px-3 py-2.5"
                  data-testid="agent-receipt-review-before"
                >
                  <dt className="text-xs text-ink-3">Top 5 before review</dt>
                  <dd className="mt-1 text-ink-2 break-words">{review.before.join(', ')}</dd>
                </div>
                <div
                  className="rounded-control border border-border px-3 py-2.5"
                  data-testid="agent-receipt-review-after"
                >
                  <dt className="text-xs text-ink-3">Top 5 after review</dt>
                  <dd className="mt-1 text-ink-2 break-words">{review.after.join(', ')}</dd>
                </div>
              </dl>
              {review.outcomeLine && (
                <p className="mt-2 text-sm text-ink-2 break-words" data-testid="agent-receipt-review-outcome">
                  {review.outcomeLine}
                </p>
              )}
            </div>
          )}

          <h3 className="mt-6 text-sm font-semibold text-ink">Run steps</h3>
          <ol className="mt-3 space-y-3" data-testid="agent-receipt-steps">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-control border border-border bg-surface-2/40 px-3 py-2.5 sm:px-4"
                data-testid={`agent-receipt-step-${row.id}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium text-ink break-words">{row.label}</p>
                  {row.durationSec && (
                    <p className="shrink-0 text-xs tabular-nums text-ink-3">{row.durationSec}</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-3 break-words">Source: {row.dataSource}</p>
                <p className="mt-1 text-sm text-ink-2 break-words">{row.result}</p>
                {row.reason && (
                  <p className="mt-1 text-sm text-ink-2 break-words">
                    <span className="font-medium text-ink">Why: </span>
                    {row.reason}
                  </p>
                )}
                {row.status === 'error' && (
                  <p className={cn('mt-1 text-xs text-danger')}>Step ended with an error</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
