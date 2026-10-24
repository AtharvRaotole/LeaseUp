import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { AnalysisRequest, Location } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { placeNeighborhoodBold } from '../../lib/location-label';
import { buildReportPath } from '../../lib/report-params';
import { tradeAreaLabel, tradeAreaTooltip } from '../../lib/broker-copy';
import { InfoTooltip } from '../ui/InfoTooltip';
import { useNavigate, useParams } from 'react-router-dom';

export function ReportStickyHeader({
  request,
  location,
  chipSlug,
  onRadiusChange,
  onSharePitch,
  onRunProspecting,
}: {
  request: AnalysisRequest;
  location: Location;
  chipSlug?: string | null;
  onRadiusChange: (radius: number) => void;
  onSharePitch?: () => void;
  onRunProspecting?: () => void;
}) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [radiusOpen, setRadiusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const neighborhood = placeNeighborhoodBold(location, chipSlug ?? slug);
  const radiusKey = String(request.radius) as '2' | '5' | '10';

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div className="sticky top-16 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-3 md:gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink md:font-normal md:text-ink-2">
          <span className="md:font-semibold md:text-ink">{neighborhood}</span>
          <span className="hidden text-ink-3 md:inline"> · </span>
          <span className="hidden truncate md:inline">{request.address}</span>
        </p>
        <div className="relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-pill border border-border bg-surface-2 px-3 text-sm tabular-nums text-ink transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setRadiusOpen((o) => !o)}
            aria-expanded={radiusOpen}
            aria-label={`Trade area: ${tradeAreaLabel(request.radius)}`}
          >
            {tradeAreaLabel(request.radius)}
          </button>
          <InfoTooltip label={tradeAreaTooltip(request.radius)} />
          {radiusOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 rounded-card border border-border bg-surface p-3 shadow-pop">
              <SegmentedControl
                label="Trade area"
                value={radiusKey}
                onChange={(v) => {
                  const r = Number(v);
                  onRadiusChange(r);
                  navigate(buildReportPath({ ...request, radius: r }, slug ?? 'run'), { replace: true });
                  setRadiusOpen(false);
                }}
                options={[
                  { value: '2', label: '2 km area' },
                  { value: '5', label: '5 km area' },
                  { value: '10', label: '10 km area' },
                ]}
              />
            </div>
          )}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>New search</Button>
          {onRunProspecting && (
            <Button variant="secondary" size="sm" onClick={onRunProspecting} data-testid="run-full-prospecting">
              Run full prospecting
            </Button>
          )}
          {onSharePitch && (
            <Button variant="secondary" size="sm" onClick={onSharePitch} data-testid="share-pitch">
              Share pitch
            </Button>
          )}
        </div>
        <div className="relative shrink-0 md:hidden" ref={menuRef}>
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border bg-surface-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="More actions"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 min-w-[10rem] rounded-card border border-border bg-surface py-1 shadow-pop">
              <button
                type="button"
                className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={() => navigate('/')}
              >
                New search
              </button>
              {onRunProspecting && (
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  onClick={onRunProspecting}
                >
                  Run full prospecting
                </button>
              )}
              {onSharePitch && (
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  onClick={onSharePitch}
                >
                  Share pitch
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
