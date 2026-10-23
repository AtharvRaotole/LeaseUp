import { LeaseUpGlyph } from './Logo';
import { cn } from '../../lib/cn';

export function BrandLoading({ label = 'Analyzing', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-12 text-center', className)} role="status">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-accent/25 border-t-accent animate-spin"
          aria-hidden
        />
        <LeaseUpGlyph size={28} className="relative text-accent" />
      </div>
      <p className="text-sm text-ink-2">{label}</p>
    </div>
  );
}
