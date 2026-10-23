import { useState } from 'react';
import type { ProspectingJob, ProspectingStep } from '@leaseup/contracts';
import { cn } from '../../lib/cn';

export function ProspectingTimeline({
  job,
  loading,
}: {
  job: ProspectingJob;
  loading: boolean;
}) {
  return (
    <ol className="space-y-4" data-testid="prospecting-timeline">
      {job.steps.map((step) => (
        <StepRow key={step.id} step={step} active={loading && step.status === 'running'} />
      ))}
    </ol>
  );
}

function StepRow({ step, active }: { step: ProspectingStep; active: boolean }) {
  const [open, setOpen] = useState(false);
  const hasDetail = step.detail && Object.keys(step.detail).length > 0;

  return (
    <li className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
            step.status === 'complete' && 'bg-accent-soft text-accent',
            (step.status === 'running' || active) && 'bg-surface-2 text-ink ring-1 ring-accent',
            step.status === 'pending' && 'bg-surface-2 text-ink-3',
            step.status === 'error' && 'bg-danger/10 text-danger'
          )}
        >
          {step.status === 'complete' ? '✓' : step.status === 'error' ? '!' : '·'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{step.label}</p>
          {step.summary && <p className="mt-1 text-sm text-ink-2">{step.summary}</p>}
          {step.durationMs !== undefined && step.status === 'complete' && (
            <p className="mt-1 text-xs tabular-nums text-ink-3">
              {(step.durationMs / 1000).toFixed(1)} s
            </p>
          )}
          {hasDetail && (
            <button
              type="button"
              className="mt-2 text-sm text-accent hover:underline"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? 'Hide evidence' : 'Show evidence'}
            </button>
          )}
          {open && hasDetail && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-control bg-surface-2 p-3 text-xs text-ink-2">
              {JSON.stringify(step.detail, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </li>
  );
}
