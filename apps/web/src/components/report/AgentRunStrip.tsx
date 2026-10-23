import { useState } from 'react';
import type { AnalysisStep } from '@leaseup/contracts';
import { cn } from '../../lib/cn';

const STEP_ORDER = ['locate', 'taste', 'backtest', 'prospects', 'verify'] as const;
const STEP_LABELS: Record<string, string> = {
  locate: 'Locate',
  taste: 'Read taste',
  backtest: 'Prove',
  prospects: 'Find gaps',
  verify: 'Double check',
};

function formatRecordedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AgentRunStrip({
  steps,
  loading,
  elapsedMs,
  demoMode,
  recordedAt,
}: {
  steps: AnalysisStep[];
  loading: boolean;
  elapsedMs: number | null;
  demoMode?: boolean;
  recordedAt?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const byId = new Map(steps.map((s) => [s.id, s]));

  if (!loading && !expanded) {
    if (demoMode && recordedAt) {
      return (
        <div className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-ink-2">
          <button
            type="button"
            className="text-ink underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-accent rounded-control"
            onClick={() => setExpanded(true)}
          >
            Recorded data from {formatRecordedDate(recordedAt)}. Show steps
          </button>
        </div>
      );
    }
    if (elapsedMs !== null) {
      const seconds = (elapsedMs / 1000).toFixed(1);
      return (
        <div className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-ink-2">
          <button
            type="button"
            className="text-ink underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-accent rounded-control"
            onClick={() => setExpanded(true)}
          >
            Analyzed in {seconds} s. Show steps
          </button>
        </div>
      );
    }
  }

  const activeId = STEP_ORDER.find((id) => byId.get(id)?.status === 'running') ?? STEP_ORDER[0];

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      {loading ? (
        <>
          <p className="mb-2 text-sm text-ink-2">{STEP_LABELS[activeId]}…</p>
          <div className="flex flex-wrap items-center gap-2">
            {STEP_ORDER.map((id) => {
              const step = byId.get(id);
              const status = step?.status ?? (id === activeId ? 'running' : 'pending');
              return (
                <span
                  key={id}
                  className={cn(
                    'rounded-pill px-2.5 py-1 text-xs font-medium',
                    status === 'complete' && 'bg-accent-soft text-accent',
                    status === 'running' && 'bg-surface-2 text-ink ring-1 ring-accent',
                    status === 'pending' && 'text-ink-3'
                  )}
                >
                  {STEP_LABELS[id]}
                </span>
              );
            })}
            {elapsedMs !== null && (
              <span className="ml-auto font-mono text-xs tabular-nums text-ink-3">
                {(elapsedMs / 1000).toFixed(1)} s
              </span>
            )}
          </div>
        </>
      ) : (
        <ul className="space-y-2 text-sm">
          {STEP_ORDER.map((id) => {
            const step = byId.get(id);
            if (!step) return null;
            return (
              <li key={id} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                <span className="font-medium text-ink">{step.label}</span>
                <span className="text-ink-2 text-right">{step.summary}</span>
              </li>
            );
          })}
        </ul>
      )}
      {!loading && expanded && (
        <button
          type="button"
          className="mt-3 text-sm text-ink-2 hover:text-ink"
          onClick={() => setExpanded(false)}
        >
          Collapse
        </button>
      )}
    </div>
  );
}
