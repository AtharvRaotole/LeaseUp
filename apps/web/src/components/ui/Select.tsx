import { cn } from '../../lib/cn';

export function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-label text-ink-3">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-control border border-border bg-surface px-3 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
