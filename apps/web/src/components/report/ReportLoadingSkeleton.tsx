import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

/** Layout-matched placeholders while a report loads (avoids jump when data arrives). */
export function ReportLoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="report-loading-skeleton" aria-busy="true" aria-label="Loading report">
      <Card className="space-y-6">
        <Skeleton className="h-8 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid grid-cols-3 gap-1.5 md:gap-3">
          <Skeleton className="h-[72px] md:h-[88px]" />
          <Skeleton className="h-[72px] md:h-[88px]" />
          <Skeleton className="h-[72px] md:h-[88px]" />
        </div>
      </Card>
      <Card className="space-y-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <ol className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex gap-4 rounded-card border border-border px-4 py-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-control" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5 max-w-[160px]" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-36 rounded-control" />
          <Skeleton className="h-10 w-40 rounded-control" />
        </div>
      </Card>
    </div>
  );
}
