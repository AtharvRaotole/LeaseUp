import { PIPELINE_STATUSES } from '../../lib/pipeline-status';
import { Skeleton } from '../ui/Skeleton';

export function PipelineLoadingSkeleton() {
  return (
    <div
      className="mt-8 flex min-w-0 max-w-full gap-3 overflow-x-auto pb-4 md:gap-4"
      data-testid="pipeline-loading-skeleton"
      aria-busy="true"
      aria-label="Loading pipeline"
    >
      {PIPELINE_STATUSES.map((col) => (
        <div
          key={col.id}
          className="flex w-[min(88vw,260px)] shrink-0 flex-col rounded-card border border-border bg-surface-2/50 md:w-[min(100%,260px)]"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <Skeleton className="h-4 w-16" aria-hidden />
            <Skeleton className="h-5 w-6 rounded-full" aria-hidden />
          </div>
          <div className="space-y-2 p-2">
            <Skeleton className="h-[88px] w-full rounded-control" />
            <Skeleton className="h-[88px] w-full rounded-control" />
          </div>
        </div>
      ))}
    </div>
  );
}
