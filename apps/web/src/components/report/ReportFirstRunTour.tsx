import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { REPORT_TOUR_STORAGE_KEY } from '../../lib/broker-copy';
import { cn } from '../../lib/cn';
import { useOnEscape } from '../../hooks/useOnEscape';

const STEPS = [
  {
    title: 'Your pitch list',
    body: 'Each row is a brand local shoppers love that does not have a store in your trade area yet.',
    targetTestId: 'report-top-brands-list',
    highlightTestId: 'report-top-brands-list',
    placement: 'list',
  },
  {
    title: 'Why this brand',
    body: 'Select a row to see plain-language reasons and open the map for that chain.',
    targetTestId: 'why-this-brand',
    highlightTestId: 'why-this-brand',
    placement: 'default',
  },
  {
    title: 'Track outreach',
    body: 'Add strong fits to your pipeline so nothing falls through the cracks.',
    targetTestId: 'report-pipeline-cta',
    highlightTestId: 'report-pipeline-cta',
    placement: 'default',
  },
] as const;

type Phase = 'hidden' | 'hint' | 'steps';

type PopoverLayout =
  | { mode: 'sheet' }
  | { mode: 'floating'; top: number; left: number; width: number; arrow: 'top' | 'left' | 'right' };

function highlightTarget(testId: string | undefined) {
  document.querySelectorAll('[data-tour-active]').forEach((node) => {
    node.removeAttribute('data-tour-active');
  });
  if (!testId) return;
  const el = document.querySelector(`[data-testid="${testId}"]`);
  el?.setAttribute('data-tour-active', 'true');
}

function computeLayout(stepIndex: number): PopoverLayout | null {
  const current = STEPS[stepIndex] ?? STEPS[0];
  const anchor = document.querySelector(`[data-testid="${current.targetTestId}"]`);
  if (!anchor) return null;

  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    return { mode: 'sheet' };
  }

  const width = Math.min(300, window.innerWidth - 24);
  const margin = 12;
  const rect = anchor.getBoundingClientRect();

  if (current.placement === 'list') {
    const firstRow = anchor.querySelector('li:first-child button');
    const rowRect = firstRow?.getBoundingClientRect() ?? rect;
    const spaceRight = window.innerWidth - rect.right - margin;
    if (spaceRight >= width + 16) {
      return {
        mode: 'floating',
        top: Math.max(margin, rowRect.top),
        left: rect.right + 16,
        width,
        arrow: 'left',
      };
    }
    const spaceLeft = rect.left - margin;
    if (spaceLeft >= width + 16) {
      return {
        mode: 'floating',
        top: Math.max(margin, rowRect.top),
        left: rect.left - width - 16,
        width,
        arrow: 'right',
      };
    }
    return {
      mode: 'floating',
      top: Math.min(rowRect.bottom + 14, window.innerHeight - 220),
      left: Math.max(margin, rect.left),
      width: Math.min(width, rect.width),
      arrow: 'top',
    };
  }

  let left = rect.left;
  if (left + width > window.innerWidth - margin) {
    left = window.innerWidth - width - margin;
  }
  left = Math.max(margin, left);
  const top = Math.min(rect.bottom + 14, window.innerHeight - 220);
  return { mode: 'floating', top, left, width, arrow: 'top' };
}

function readTourDone(): boolean {
  try {
    return localStorage.getItem(REPORT_TOUR_STORAGE_KEY) === 'done';
  } catch {
    return true;
  }
}

function persistTourDone() {
  try {
    localStorage.setItem(REPORT_TOUR_STORAGE_KEY, 'done');
  } catch {
    /* private mode */
  }
}

export function ReportFirstRunTour({ ready }: { ready: boolean }) {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [step, setStep] = useState(0);
  const [layout, setLayout] = useState<PopoverLayout | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (readTourDone()) return;
    setPhase('hint');
  }, [ready]);

  const finish = useCallback(() => {
    persistTourDone();
    setPhase('hidden');
    highlightTarget(undefined);
  }, []);

  const startSteps = useCallback(() => {
    setStep(0);
    setPhase('steps');
  }, []);

  useOnEscape(() => {
    if (phase === 'steps') finish();
    else if (phase === 'hint') finish();
  }, phase !== 'hidden');

  const placePopover = useCallback(() => {
    const current = STEPS[step] ?? STEPS[0];
    setLayout(computeLayout(step));
    highlightTarget(current.highlightTestId);
  }, [step]);

  useLayoutEffect(() => {
    if (phase !== 'steps') {
      highlightTarget(undefined);
      setLayout(null);
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
  }, [phase, step, placePopover]);

  if (phase === 'hint') {
    return createPortal(
      <div
        className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:justify-end sm:px-0"
        data-testid="report-first-run-tour-hint"
      >
        <div
          className="pointer-events-auto w-full max-w-md rounded-card border border-border bg-surface p-4 shadow-pop sm:max-w-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-body text-ink">Quick tour available</p>
              <p className="mt-1 text-small text-ink-2">
                See where your pitch list, brand details, and pipeline live. Your report stays fully visible.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-control p-1 text-ink-3 transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={finish}
              aria-label="Dismiss tour hint"
              data-testid="report-tour-hint-dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={startSteps}
              data-testid="report-tour-take"
            >
              Take the tour
            </Button>
            <button
              type="button"
              className="rounded-control text-small text-ink-3 underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={finish}
            >
              Not now
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (phase !== 'steps' || !layout) return null;

  const current = STEPS[step] ?? STEPS[0];
  const isLast = step >= STEPS.length - 1;

  const arrowClass =
    layout.mode === 'floating'
      ? layout.arrow === 'left'
        ? 'before:-left-2 before:top-6 before:border-r-surface'
        : layout.arrow === 'right'
          ? 'before:-right-2 before:top-6 before:border-l-surface'
          : 'before:left-8 before:-top-2 before:border-b-surface'
      : '';

  return createPortal(
    <div
      className={cn(
        'no-print fixed z-[60] border border-border bg-surface p-4 shadow-pop',
        layout.mode === 'sheet'
          ? 'inset-x-0 bottom-0 rounded-t-card rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))]'
          : cn(
              'rounded-card before:absolute before:h-0 before:w-0 before:border-8 before:border-transparent before:content-[""]',
              arrowClass
            )
      )}
      style={
        layout.mode === 'floating'
          ? { top: layout.top, left: layout.left, width: layout.width }
          : undefined
      }
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
          onClick={finish}
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
          <Button type="button" size="sm" variant="primary" onClick={finish} data-testid="report-tour-finish">
            Got it
          </Button>
        )}
        <button
          type="button"
          className="rounded-control text-small text-ink-3 underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={finish}
        >
          Skip tour
        </button>
      </div>
    </div>,
    document.body
  );
}
