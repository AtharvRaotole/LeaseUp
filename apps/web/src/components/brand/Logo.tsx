import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { GLYPH_PATHS } from './glyph-paths';

export type LogoVariant = 'glyph' | 'wordmark' | 'lockup';

export function LeaseUpGlyph({
  className,
  size = 24,
  title,
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 text-accent', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path fill="currentColor" d={GLYPH_PATHS.lBar} />
      <path fill="currentColor" d={GLYPH_PATHS.chevron} />
    </svg>
  );
}

function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-sans text-[15px] font-semibold tracking-[-0.02em] text-ink',
        className
      )}
    >
      LeaseUp
    </span>
  );
}

export function Logo({
  variant = 'lockup',
  href = '/',
  className,
  glyphSize = 24,
}: {
  variant?: LogoVariant;
  href?: string;
  className?: string;
  glyphSize?: number;
}) {
  const inner =
    variant === 'glyph' ? (
      <LeaseUpGlyph size={glyphSize} title="LeaseUp" />
    ) : variant === 'wordmark' ? (
      <Wordmark />
    ) : (
      <span className="inline-flex items-center gap-[0.42rem]">
        <LeaseUpGlyph size={glyphSize} />
        <Wordmark />
      </span>
    );

  if (!href) {
    return <span className={className}>{inner}</span>;
  }

  return (
    <Link
      to={href}
      className={cn(
        'inline-flex items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className
      )}
    >
      {inner}
    </Link>
  );
}
