import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import {
  reportShortListCategoryAction,
  reportShortListLine,
  reportShortListWidenAction,
} from '../../lib/empty-state-copy';
import type { AnalysisRequest, AnalysisResponse } from '@leaseup/contracts';
import { absenceRadiusKm } from '../../lib/absence-radius';
import { buildReportPath } from '../../lib/report-params';

export function ReportShortListNotice({
  count,
  radiusKm,
  results,
  request,
  slug,
}: {
  count: number;
  radiusKm: number;
  results?: AnalysisResponse;
  request: AnalysisRequest;
  slug: string;
}) {
  const absenceKm = absenceRadiusKm(results, radiusKm);
  const wider = Math.min(25, radiusKm + 5);
  return (
    <div
      className="rounded-card border border-border bg-surface-2 px-4 py-3 text-sm text-ink-2"
      data-testid="report-short-list-notice"
      role="status"
    >
      <p>{reportShortListLine(count, absenceKm)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {radiusKm < 25 && (
          <Link to={buildReportPath({ ...request, radius: wider }, slug)}>
            <Button type="button" variant="secondary" size="sm">
              {reportShortListWidenAction}
            </Button>
          </Link>
        )}
        <Link to="/">
          <Button type="button" variant="ghost" size="sm">
            {reportShortListCategoryAction}
          </Button>
        </Link>
      </div>
    </div>
  );
}
