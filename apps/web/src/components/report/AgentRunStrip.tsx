import { useState } from 'react';
import type { AnalysisStep } from '@leaseup/contracts';
import { cn } from '../../lib/cn';
import { formatUserFacingDate } from '../../lib/format-date';

const STEP_ORDER = ['locate', 'taste', 'backtest', 'prospects', 'verify'] as const;
const STEP_LABELS: Record<string, string> = {
  locate: 'Find your pin on the map',
  taste: 'Read what shoppers love nearby',
  backtest: 'Compare picks to real stores',
  prospects: 'Build your pitch list',
  verify: 'Double-check with a second map',
};

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
  const activeId = STEP_ORDER.find((id) => byId.get(id)?.status === 'running') ?? STEP_ORDER[0];

  if (loading) {
    return (
      <div
        className="rounded-card border border-border bg-surface p-4 no-print"
        aria-live="polite"
        data-testid="agent-run-strip-loading"
      >
        <p className="text-label uppercase text-ink-3">Progress</p>
        <p className="mt-1 text-sm text-ink-2">{STEP_LABELS[activeId]}…</p>
        <ol className="mt-4 space-y-3">
          {STEP_ORDER.map((id) => {
            const step = byId.get(id);
            const status = step?.status ?? (id === activeId ? 'running' : 'pending');
            return (
              <li key={id} className="flex items-start gap-3 text-sm">
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    status === 'complete' && 'bg-accent-soft text-accent',
                    status === 'running' && 'bg-surface-2 text-ink ring-1 ring-accent',
                    status === 'pending' && 'bg-surface-2 text-ink-3'
                  )}
                >
                  {status === 'complete' ? '✓' : STEP_ORDER.indexOf(id) + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{STEP_LABELS[id]}</p>
                  {step?.summary && <p className="text-ink-2">{step.summary}</p>}
                  {step?.durationMs !== undefined && status === 'complete' && (
                    <p className="text-xs tabular-nums text-ink-3">
                      {(step.durationMs / 1000).toFixed(1)} s
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {elapsedMs !== null && (
          <p className="mt-3 text-xs tabular-nums text-ink-3">
            Elapsed {(elapsedMs / 1000).toFixed(1)} s
          </p>
        )}
      </div>
    );
  }

  if (!expanded) {
    if (demoMode && recordedAt) {
      return (
        <div
          className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-ink-2 no-print"
          data-testid="agent-run-strip-recorded"
        >
          <button
            type="button"
            className="text-ink underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-accent rounded-control"
            onClick={() => setExpanded(true)}
            data-testid="agent-run-strip-show-steps"
          >
            Recorded data from {formatUserFacingDate(recordedAt)}. Show steps
          </button>
        </div>
      );
    }
    if (elapsedMs !== null) {
      const seconds = (elapsedMs / 1000).toFixed(1);
      return (
        <div className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-ink-2 no-print">
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

  return (
    <div className="rounded-card border border-border bg-surface p-4 no-print" data-testid="agent-run-strip">
      <p className="text-label uppercase text-ink-3">{demoMode ? 'Recorded steps' : 'Progress'}</p>
      {demoMode && recordedAt && (
        <p className="mt-1 text-xs text-ink-3" data-testid="agent-run-strip-recorded-note">
          Replayed from the recording made {formatUserFacingDate(recordedAt)}. No live calls ran for this report.
        </p>
      )}
      <ul className="mt-3 space-y-2 text-sm">
        {STEP_ORDER.map((id) => {
          const step = byId.get(id);
          if (!step) return null;
          return (
            <li
              key={id}
              className="flex justify-between gap-4 border-b border-border pb-2 last:border-0"
              data-testid={`agent-run-step-${id}`}
            >
              <span className="font-medium text-ink">{step.label}</span>
              <span className="text-right text-ink-2">
                {step.summary}
                {step.durationMs !== undefined && (
                  <span className="ml-2 text-xs tabular-nums text-ink-3">
                    {(step.durationMs / 1000).toFixed(1)} s
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {expanded && (
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
