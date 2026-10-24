import { cn } from '../../lib/cn';

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; testId?: string }>;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-label text-ink-3">{label}</span>}
      <div className="inline-flex rounded-control border border-border bg-surface-2 p-0.5" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            data-testid={opt.testId}
            onClick={() => onChange(opt.value)}
            className={cn(
              'ui-transition min-h-11 min-w-[2.75rem] px-3 rounded-[6px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2',
              value === opt.value
                ? 'bg-surface text-ink shadow-sm border border-border'
                : 'text-ink-2 hover:text-ink'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
