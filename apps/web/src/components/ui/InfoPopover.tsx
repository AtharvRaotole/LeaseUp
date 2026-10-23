import { useId, useRef, useState, useCallback } from 'react';
import { useOnEscape } from '../../hooks/useOnEscape';
import { Info } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Tap-friendly help for short labels (store check, badges). */
export function InfoPopover({
  label,
  body,
  className,
}: {
  label: string;
  body: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOnEscape(close, open);

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        type="button"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={(e) => {
          if (!panelRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <div
          ref={panelRef}
          id={id}
          role="tooltip"
          className="absolute right-0 top-full z-30 mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-card border border-border bg-surface px-3 py-2 text-left text-xs leading-snug text-ink-2 shadow-pop"
          onClick={(e) => e.stopPropagation()}
        >
          {body}
        </div>
      )}
    </span>
  );
}
