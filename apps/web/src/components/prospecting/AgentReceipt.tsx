import { useMemo, useState } from 'react';
import type { ProspectingJob } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import {
  agentReceiptJson,
  agentReceiptMarkdown,
  buildAgentReceiptRows,
  downloadAgentReceiptFile,
  loggedProspectingSteps,
} from '../../lib/agent-receipt';
import { cn } from '../../lib/cn';

export function AgentReceipt({ job }: { job: ProspectingJob }) {
  const rows = useMemo(() => buildAgentReceiptRows(job), [job]);
  const loggedCount = loggedProspectingSteps(job.steps).length;
  const [open, setOpen] = useState(true);

  if (job.status !== 'complete' || rows.length === 0) return null;

  const baseName = `leaseup-agent-receipt-${job.id.slice(0, 8)}`;

  return (
    <section
      className="mt-8 rounded-card border border-border bg-surface"
      data-testid="agent-receipt"
    >
      <button
        type="button"
        className="flex w-full min-h-12 items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <p className="font-medium text-ink">Agent receipt</p>
          <p className="mt-0.5 text-sm text-ink-2">
            {loggedCount} logged step{loggedCount === 1 ? '' : 's'} from this run
          </p>
        </div>
        <span className="shrink-0 text-sm text-accent">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 sm:px-5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
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

          <ol className="mt-4 space-y-3" data-testid="agent-receipt-steps">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-control border border-border bg-surface-2/40 px-3 py-2.5 sm:px-4"
                data-testid={`agent-receipt-step-${row.id}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{row.label}</p>
                  {row.durationSec && (
                    <p className="text-xs tabular-nums text-ink-3">{row.durationSec}</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-3">Source: {row.dataSource}</p>
                <p className="mt-1 text-sm text-ink-2">{row.result}</p>
                {row.reason && (
                  <p className="mt-1 text-sm text-ink-2">
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
