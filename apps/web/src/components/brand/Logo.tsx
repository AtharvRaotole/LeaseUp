import { cn } from '../../lib/cn';

type LogoVariant = 'mark' | 'wordmark' | 'lockup';
type LogoSize = 'xs' | 'sm' | 'md' | 'lg';

/** Optical lockup: mark box sized to sit with Geist semibold cap height. */
const sizeMap: Record<LogoSize, { mark: number; text: string }> = {
  xs: { mark: 17, text: 'text-[13px] leading-none' },
  sm: { mark: 20, text: 'text-[15px] leading-none' },
  md: { mark: 22, text: 'text-base leading-none' },
  lg: { mark: 26, text: 'text-lg leading-none' },
};

export type LogoProps = {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  hideWordmarkFromA11y?: boolean;
};

function MarkIcon({ box }: { box: number }) {
  const useSnap16 = box <= 18;
  if (useSnap16) {
    return (
      <svg
        width={box}
        height={box}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0"
      >
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path fill="currentColor" d="M3.5 12.5V5.5H7.25V9.25H12.5V12.5H3.5Z" />
      </svg>
    );
  }

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
      <rect x="5" y="5" width="22" height="22" rx="4" stroke="currentColor" strokeWidth="2.9" />
      <path fill="currentColor" d="M8 25.15V11.05H14.35V18.25H25.15V25.15H8Z" />
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
      className={cn('font-semibold tracking-[-0.02em] text-ink', text)}
      aria-hidden={hideWordmarkFromA11y || undefined}
    >
      LeaseUp
    </span>
  );

  if (variant === 'wordmark') {
    return <span className={cn('inline-flex items-center', className)}>{wordmark}</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-2 text-accent', className)}>
      <MarkIcon box={mark} />
      {wordmark}
    </span>
  );
}
