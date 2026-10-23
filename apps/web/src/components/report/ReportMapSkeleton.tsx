import { Skeleton } from '../ui/Skeleton';

export function ReportMapSkeleton() {
  return (
    <div
      className="flex h-[min(72vh,640px)] min-h-[360px] w-full flex-col overflow-hidden rounded-card border border-border bg-surface-2"
      data-testid="report-map-skeleton"
      aria-hidden
    >
      <Skeleton className="m-3 h-8 w-32 rounded-pill" />
      <Skeleton className="mx-3 mb-3 flex-1 rounded-control" />
    </div>
  );
}
