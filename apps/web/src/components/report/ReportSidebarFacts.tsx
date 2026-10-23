import { Link } from 'react-router-dom';
import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { hitRateStatLabel } from '../../lib/hit-rate';
import { placeHeadlineLabel } from '../../lib/location-label';

/** Real summary stats for the report map column (desktop). */
export function ReportSidebarFacts({
  results,
  radiusKm,
  chipSlug,
}: {
  results: AnalysisResponse;
  radiusKm: number;
  chipSlug?: string | null;
}) {
  const area = placeHeadlineLabel(results.location, chipSlug);
  const analyzed = results.rankings?.length ?? 0;
  const hit = results.backtest ? hitRateStatLabel(results.backtest) : null;

  return (
    <Card className="hidden p-4 md:block">
      <h3 className="text-sm font-semibold text-ink">At this pin</h3>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-label uppercase text-ink-3">Trade area</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {area} · {radiusKm} km
          </dd>
        </div>
        <div>
          <dt className="text-label uppercase text-ink-3">Pitch list</dt>
          <dd className="mt-0.5 tabular-nums text-ink">
            {results.prospects.length} brand{results.prospects.length === 1 ? '' : 's'}
          </dd>
        </div>
        {analyzed > 0 && (
          <div>
            <dt className="text-label uppercase text-ink-3">Chains scored</dt>
            <dd className="mt-0.5 tabular-nums text-ink">{analyzed}</dd>
          </div>
        )}
        {hit && (
          <div>
            <dt className="text-label uppercase text-ink-3">Already nearby in top 10</dt>
            <dd className="mt-0.5 tabular-nums text-ink">{hit}</dd>
          </div>
        )}
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-ink-3">
        Store checks use All The Places
        {results.mode === 'demo' ? ' and OpenStreetMap on demo chips' : ''}.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Link to="/methodology" className="text-sm font-medium text-accent hover:underline">
          How we rank tenants
        </Link>
        <Link to="/pipeline" className="text-sm font-medium text-accent hover:underline">
          Track outreach in pipeline
        </Link>
      </div>
    </Card>
  );
}
