import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-control bg-surface-2 motion-reduce:animate-none', className)}
      aria-hidden
    />
  );
}
