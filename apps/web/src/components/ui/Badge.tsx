import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2 border-border',
  success: 'bg-accent-soft text-success border border-border/40',
  warn: 'bg-surface-2 text-warn border border-royal/30',
  danger: 'bg-surface-2 text-danger border border-danger/25',
  info: 'bg-surface-2 text-info border border-info/25',
  accent: 'bg-accent-soft text-accent-muted border border-accent/20',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-meta font-medium tabular-nums',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
