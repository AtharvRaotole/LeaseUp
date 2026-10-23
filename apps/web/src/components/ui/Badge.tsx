import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2 border-border',
  success: 'bg-accent-soft text-success border-transparent',
  warn: 'bg-[#FEF3C7] text-warn border-transparent dark:bg-[#422006]',
  danger: 'bg-[#FEE2E2] text-danger border-transparent dark:bg-[#431407]',
  info: 'bg-[#DBEAFE] text-info border-transparent dark:bg-[#1e3a5f]',
  accent: 'bg-accent-soft text-accent border-transparent',
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
