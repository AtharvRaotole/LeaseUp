import type { AnalysisStep } from '@leaseup/contracts';
import { ReportLoadingSkeleton } from './ReportLoadingSkeleton';
import { AgentRunStrip } from './AgentRunStrip';

/** Skeleton layout plus named progress while the first report payload loads. */
export function ReportLoadingPanel({
  steps,
  loading,
  geocodeChecking,
  elapsedMs,
}: {
  steps: AnalysisStep[];
  loading: boolean;
  geocodeChecking: boolean;
  elapsedMs: number | null;
}) {
  const status = geocodeChecking
    ? 'Checking address on the map…'
    : 'Reading local taste and store locations…';

  return (
    <div className="space-y-4" data-testid="report-loading-panel">
      <p className="text-sm text-ink-2" role="status">{status}</p>
      <ReportLoadingSkeleton />
      {(loading || steps.length > 0) && (
        <AgentRunStrip
          steps={steps}
          loading={loading}
          elapsedMs={elapsedMs}
        />
      )}
    </div>
  );
}
