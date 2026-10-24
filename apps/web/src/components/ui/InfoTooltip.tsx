import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { cn } from '../../lib/cn';

export function InfoTooltip({
  label,
  className,
  iconClassName,
  side = 'top',
}: {
  label: string;
  className?: string;
  iconClassName?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              className
            )}
            aria-label={label}
            data-testid="info-tooltip-trigger"
          >
            <Info className={cn('h-4 w-4', iconClassName)} aria-hidden />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={6}
            className="z-50 max-w-[min(18rem,calc(100vw-2rem))] rounded-control border border-border bg-surface px-3 py-2 text-xs leading-snug text-ink shadow-pop transition-opacity duration-150"
          >
            {label}
            <Tooltip.Arrow className="fill-surface" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
