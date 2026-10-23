import { useState } from 'react';
import type { AnalysisRequest, Location } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { placeNeighborhoodBold } from '../../lib/location-label';
import { buildReportPath } from '../../lib/report-params';
import { useNavigate, useParams } from 'react-router-dom';

export function ReportStickyHeader({
  request,
  location,
  onRadiusChange,
}: {
  request: AnalysisRequest;
  location: Location;
  onRadiusChange: (radius: number) => void;
}) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [radiusOpen, setRadiusOpen] = useState(false);
  const neighborhood = placeNeighborhoodBold(location);
  const radiusKey = String(request.radius) as '2' | '5' | '10';

  const share = () => void navigator.clipboard.writeText(window.location.href);

  return (
    <div className="sticky top-16 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3">
        <p className="min-w-0 flex-1 text-sm text-ink-2 truncate">
          <span className="font-semibold text-ink">{neighborhood}</span>
          <span className="text-ink-3"> · </span>
          <span>{request.address}</span>
        </p>
        <div className="relative">
          <button
            type="button"
            className="rounded-pill border border-border bg-surface-2 px-3 py-1.5 text-sm font-mono tabular-nums text-ink hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setRadiusOpen((o) => !o)}
            aria-expanded={radiusOpen}
          >
            {request.radius} km
          </button>
          {radiusOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 rounded-card border border-border bg-surface p-3 shadow-pop">
              <SegmentedControl
                label="Radius"
                value={radiusKey}
                onChange={(v) => {
                  const r = Number(v);
                  onRadiusChange(r);
                  navigate(buildReportPath({ ...request, radius: r }, slug ?? 'run'), { replace: true });
                  setRadiusOpen(false);
                }}
                options={[
                  { value: '2', label: '2 km' },
                  { value: '5', label: '5 km' },
                  { value: '10', label: '10 km' },
                ]}
              />
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>New search</Button>
        <Button variant="secondary" size="sm" onClick={share}>Share</Button>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>Export PDF</Button>
      </div>
    </div>
  );
}
