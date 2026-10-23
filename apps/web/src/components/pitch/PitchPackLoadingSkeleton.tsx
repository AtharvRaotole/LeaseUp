import { Skeleton } from '../ui/Skeleton';

/** Matches PitchPackBrief layout to avoid shift when snapshot loads. */
export function PitchPackLoadingSkeleton() {
  return (
    <div
      className="mx-auto max-w-[880px] min-w-0 space-y-8 px-4 py-10"
      data-testid="pitch-pack-loading-skeleton"
      aria-busy="true"
      aria-label="Loading pitch pack"
    >
      <header className="space-y-3 border-b border-border pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-5 w-full max-w-lg" />
        <Skeleton className="h-4 w-48" />
      </header>
      <article className="space-y-4 rounded-card border border-border bg-surface px-5 py-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-56" />
        <ul className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-3 w-full" />
            </li>
          ))}
        </ul>
        <Skeleton className="mt-5 h-40 w-full rounded-card" />
      </article>
    </div>
  );
}
