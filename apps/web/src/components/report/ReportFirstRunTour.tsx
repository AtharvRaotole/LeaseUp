import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { REPORT_TOUR_STORAGE_KEY } from '../../lib/broker-copy';

const STEPS = [
  {
    title: 'Your pitch list',
    body: 'Each row is a brand local shoppers love that does not have a store in your trade area yet.',
    targetTestId: 'brands-to-pitch',
  },
  {
    title: 'Why this brand',
    body: 'Select a row to see plain-language reasons and open the map for that chain.',
    targetTestId: 'why-this-brand',
  },
  {
    title: 'Track outreach',
    body: 'Add strong fits to your pipeline so nothing falls through the cracks.',
    targetTestId: 'report-pipeline-cta',
  },
] as const;

export function ReportFirstRunTour({ ready }: { ready: boolean }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) return;
    try {
      if (localStorage.getItem(REPORT_TOUR_STORAGE_KEY) === 'done') return;
    } catch {
      return;
    }
    setVisible(true);
  }, [ready]);

  const dismiss = () => {
    try {
      localStorage.setItem(REPORT_TOUR_STORAGE_KEY, 'done');
    } catch {
      /* private mode */
    }
    setVisible(false);
  };

  useEffect(() => {
    document.querySelectorAll('[data-tour-active]').forEach((node) => {
      node.removeAttribute('data-tour-active');
    });
    if (!visible) return;
    const id = STEPS[step]?.targetTestId;
    if (!id) return;
    const el = document.querySelector(`[data-testid="${id}"]`);
    el?.setAttribute('data-tour-active', 'true');
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return () => {
      el?.removeAttribute('data-tour-active');
    };
  }, [step, visible]);

  if (!visible) return null;

  const current = STEPS[step] ?? STEPS[0];
  const isLast = step >= STEPS.length - 1;

  return (
    <div
      className="no-print rounded-card border border-accent/30 bg-accent-soft/40 p-4 shadow-sm transition-opacity duration-200"
      data-testid="report-first-run-tour"
      role="region"
      aria-label="Quick tour"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label uppercase text-ink-3">
            Step {step + 1} of {STEPS.length}
          </p>
          <p className="mt-1 font-medium text-ink">{current.title}</p>
          <p className="mt-1 text-sm text-ink-2">{current.body}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-control p-1 text-ink-3 transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={dismiss}
          aria-label="Dismiss tour"
          data-testid="report-tour-dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {step > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {!isLast ? (
          <Button type="button" size="sm" variant="primary" onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        ) : (
          <Button type="button" size="sm" variant="primary" onClick={dismiss} data-testid="report-tour-finish">
            Got it
          </Button>
        )}
        <button
          type="button"
          className="text-sm text-ink-3 underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
          onClick={dismiss}
        >
          Skip tour
        </button>
      </div>
    </div>
  );
}
