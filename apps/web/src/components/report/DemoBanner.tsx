import { useState } from 'react';
import { Info } from 'lucide-react';

export function DemoBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="border-b border-border bg-[#FFFBEB] px-4 py-2.5 dark:bg-[#1c1912]">
      <div className="mx-auto flex max-w-[1280px] items-start gap-2 text-[13px] leading-snug text-ink-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
        <p className="flex-1">
          Demo mode uses recorded Qloo and store data for three example addresses.
        </p>
        <button
          type="button"
          className="shrink-0 text-ink-3 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
          onClick={() => setOpen(false)}
          aria-label="Dismiss demo notice"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
