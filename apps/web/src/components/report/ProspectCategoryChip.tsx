import { cn } from '../../lib/cn';

export function ProspectCategoryChip({
  label,
  className,
  testId,
}: {
  label: string;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        'inline-flex max-w-full items-center rounded-pill border border-border bg-surface-2 px-2 py-0.5 text-caption font-medium leading-snug text-ink-3',
        className
      )}
    >
      {label}
    </span>
  );
}
