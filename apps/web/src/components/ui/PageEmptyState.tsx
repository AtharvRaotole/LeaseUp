import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export function PageEmptyState({
  icon: Icon,
  title,
  children,
  testId,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-6 py-14 text-center md:px-12 md:py-16',
        className
      )}
      data-testid={testId}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-3 shadow-sm ring-1 ring-border/70"
        aria-hidden
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h2 className="mt-5 font-display text-h3 font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 max-w-md text-body leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}
