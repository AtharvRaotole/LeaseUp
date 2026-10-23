import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

export function ReportCollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
  testId,
  sectionId,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  testId: string;
  sectionId: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section data-testid={testId} className="rounded-card border border-border bg-surface">
      <button
        type="button"
        id={`${sectionId}-trigger`}
        aria-expanded={open}
        aria-controls={`${sectionId}-panel`}
        className="flex w-full min-h-[3.25rem] items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <h3 className="font-display text-body-lg font-semibold text-ink">{title}</h3>
          {description ? <p className="mt-1 text-small text-ink-2">{description}</p> : null}
        </div>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 text-ink-3 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      <div
        id={`${sectionId}-panel`}
        role="region"
        aria-labelledby={`${sectionId}-trigger`}
        hidden={!open}
        className={cn(!open && 'hidden', 'border-t border-border px-5 py-6')}
      >
        <div className="space-y-8">{children}</div>
      </div>
    </section>
  );
}
