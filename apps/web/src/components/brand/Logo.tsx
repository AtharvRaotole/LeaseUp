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

const MARK_PATH_32 =
  'M9 5h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Zm-1.1 3.9h14.2a2.1 2.1 0 0 1 2.1 2.1v14.2a2.1 2.1 0 0 1-2.1 2.1H7.9a2.1 2.1 0 0 1-2.1-2.1V11a2.1 2.1 0 0 1 2.1-2.1ZM5 25.15V11.05h9.35v7.2H27v7.9H5Z';

const MARK_PATH_16 =
  'M4.5 2.5h7a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 11V4a1.5 1.5 0 0 1 1.5-1.5Zm-.55 1.95h7.1a1.05 1.05 0 0 1 1.05 1.05v7.1a1.05 1.05 0 0 1-1.05 1.05h-7.1A1.05 1.05 0 0 1 3.95 11V5.5a1.05 1.05 0 0 1 1.05-1.05ZM2.5 12.575V5.525h4.675v3.6H13.5v3.45H2.5Z';

export type LogoProps = {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  hideWordmarkFromA11y?: boolean;
};

function MarkIcon({ box }: { box: number }) {
  const useSnap16 = box <= 18;
  const viewBox = useSnap16 ? '0 0 16 16' : '0 0 32 32';
  const d = useSnap16 ? MARK_PATH_16 : MARK_PATH_32;

  return (
    <svg
      width={box}
      height={box}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={d} />
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
