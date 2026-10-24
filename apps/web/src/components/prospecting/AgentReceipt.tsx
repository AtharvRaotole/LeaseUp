import { useMemo, useState } from 'react';
import type { ProspectingJob } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import {
  agentReceiptJson,
  agentReceiptMarkdown,
  buildPipelineReceiptRows,
  buildPlannerReceiptSection,
  downloadAgentReceiptFile,
  loggedProspectingSteps,
} from '../../lib/agent-receipt';
import { cn } from '../../lib/cn';

export function AgentReceipt({ job }: { job: ProspectingJob }) {
  const planner = useMemo(() => buildPlannerReceiptSection(job), [job]);
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
            <div className="mt-5" data-testid="agent-receipt-ranking-impact">
              <h4 className="text-sm font-semibold text-ink">{planner.rankingImpactHeading}</h4>
              <ul className="mt-2 space-y-1.5">
                {planner.rankingImpactLines.map((line, index) => (
                  <li
                    key={`ranking-impact-${index}`}
                    className="text-sm text-ink-2 break-words"
                    data-testid={`agent-receipt-ranking-impact-${index}`}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
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
