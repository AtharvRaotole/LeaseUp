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
      <div>
        <Skeleton className="mb-3 h-6 w-40" />
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-border">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5 max-w-[200px]" />
                  <Skeleton className="h-3 w-2/5 max-w-[140px]" />
                </div>
                <Skeleton className="h-[22px] w-16 shrink-0 rounded-pill" />
                <Skeleton className="h-[22px] w-20 shrink-0 rounded-pill" />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
