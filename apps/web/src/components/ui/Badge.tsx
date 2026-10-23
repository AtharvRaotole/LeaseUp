import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2 border-border',
  success: 'bg-accent-soft text-[#0b5e44] border-transparent dark:bg-accent-soft dark:text-[#6ee7b7]',
  warn: 'bg-[#FEF3C7] text-[#6b3805] border-transparent dark:bg-[#422006] dark:text-[#fcd34d]',
  danger: 'bg-[#FEE2E2] text-[#9a3412] border-transparent dark:bg-[#431407] dark:text-[#fdba74]',
  info: 'bg-[#DBEAFE] text-[#1e40af] border-transparent dark:bg-[#1e3a5f] dark:text-[#93c5fd]',
  accent: 'bg-accent-soft text-[#0b5e44] border-transparent dark:bg-accent-soft dark:text-accent',
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
