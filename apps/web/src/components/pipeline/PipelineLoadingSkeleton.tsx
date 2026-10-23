import { PIPELINE_COLUMNS } from '../../lib/pipeline-columns';
import { Skeleton } from '../ui/Skeleton';

export function PipelineLoadingSkeleton() {
  return (
    <div
      className="mt-8 flex gap-3 overflow-x-auto pb-4"
      data-testid="pipeline-loading-skeleton"
      aria-busy="true"
      aria-label="Loading pipeline"
    >
      {PIPELINE_COLUMNS.map((col) => (
        <div
          key={col.id}
          className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-card border border-border bg-surface-2/40"
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
