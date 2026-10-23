import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { REPORT_TOUR_STORAGE_KEY } from '../../lib/broker-copy';

const STEPS = [
  {
    title: 'Your pitch list',
    body: 'Each row is a brand local shoppers love that does not have a store in your trade area yet.',
    targetTestId: 'report-top-brands-list',
    highlightTestId: 'report-top-brands-list',
  },
  {
    title: 'Why this brand',
    body: 'Select a row to see plain-language reasons and open the map for that chain.',
    targetTestId: 'why-this-brand',
    highlightTestId: 'why-this-brand',
  },
  {
    title: 'Track outreach',
    body: 'Add strong fits to your pipeline so nothing falls through the cracks.',
    targetTestId: 'report-pipeline-cta',
    highlightTestId: 'report-pipeline-cta',
  },
] as const;

function highlightTarget(testId: string | undefined) {
  document.querySelectorAll('[data-tour-active]').forEach((node) => {
    node.removeAttribute('data-tour-active');
  });
  if (!testId) return;
  const el = document.querySelector(`[data-testid="${testId}"]`);
  el?.setAttribute('data-tour-active', 'true');
}

export function ReportFirstRunTour({ ready }: { ready: boolean }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [popover, setPopover] = useState<{ top: number; left: number; width: number } | null>(null);

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
    highlightTarget(undefined);
  };

  const placePopover = () => {
    const current = STEPS[step] ?? STEPS[0];
    const anchor = document.querySelector(`[data-testid="${current.targetTestId}"]`);
    if (!anchor) {
      setPopover(null);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }
    left = Math.max(12, left);
    const top = Math.min(rect.bottom + 10, window.innerHeight - 200);
    setPopover({ top, left, width });
    highlightTarget(current.highlightTestId);
  };

  useLayoutEffect(() => {
    if (!visible) {
      highlightTarget(undefined);
      setPopover(null);
      return;
    }
    placePopover();
    const onLayout = () => placePopover();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
      highlightTarget(undefined);
    };
  }, [step, visible]);

  if (!visible || !popover) return null;

  const current = STEPS[step] ?? STEPS[0];
  const isLast = step >= STEPS.length - 1;

  return createPortal(
    <div
      className="no-print fixed z-[60] rounded-card border border-border bg-surface p-4 shadow-pop"
      style={{ top: popover.top, left: popover.left, width: popover.width }}
      data-testid="report-first-run-tour"
      role="dialog"
      aria-modal="false"
      aria-label="Quick tour"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label uppercase text-ink-3">
            Step {step + 1} of {STEPS.length}
          </p>
          <p className="mt-1 font-medium text-body-lg text-ink">{current.title}</p>
          <p className="mt-1 text-small text-ink-2">{current.body}</p>
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
          className="rounded-control text-small text-ink-3 underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={dismiss}
        >
          Skip tour
        </button>
      </div>
    </div>,
    document.body
  );
}
