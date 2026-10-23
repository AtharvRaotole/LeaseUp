import { cn } from '../../lib/cn';

type LogoVariant = 'mark' | 'wordmark' | 'lockup';
type LogoSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeMap: Record<LogoSize, { mark: number; text: string }> = {
  xs: { mark: 20, text: 'text-[13px]' },
  sm: { mark: 24, text: 'text-[15px]' },
  md: { mark: 28, text: 'text-base' },
  lg: { mark: 32, text: 'text-lg' },
};

export type LogoProps = {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  hideWordmarkFromA11y?: boolean;
};

function MarkIcon({ box }: { box: number }) {
  return (
    <svg
      width={box}
      height={box}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect x="5" y="5" width="22" height="22" rx="5.5" stroke="currentColor" strokeWidth="2.25" />
      <path fill="currentColor" d="M10 23V12h4.25v6.75H21v4.25H10z" />
    </svg>
  );
}

export function Logo({
  variant = 'lockup',
  size = 'sm',
  className,
  hideWordmarkFromA11y = false,
}: LogoProps) {
  const { mark, text } = sizeMap[size];

  if (variant === 'mark') {
    return (
      <span className={cn('inline-flex text-accent', className)} aria-hidden>
        <MarkIcon box={mark} />
      </span>
    );
  }

  const wordmark = (
    <span
      className={cn('font-semibold tracking-[-0.04em] text-ink', text)}
      aria-hidden={hideWordmarkFromA11y || undefined}
    >
      LeaseUp
    </span>
  );

  if (variant === 'wordmark') {
    return <span className={cn('inline-flex items-center', className)}>{wordmark}</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-2.5 text-accent', className)}>
      <MarkIcon box={mark} />
      {wordmark}
    </span>
  );
}
