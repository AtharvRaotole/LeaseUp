import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { AnalysisRequest, Location } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { placeNeighborhoodBold } from '../../lib/location-label';
import { buildReportPath } from '../../lib/report-params';
import { useNavigate, useParams } from 'react-router-dom';

export function ReportStickyHeader({
  request,
  location,
  chipSlug,
  onRadiusChange,
}: {
  request: AnalysisRequest;
  location: Location;
  chipSlug?: string | null;
  onRadiusChange: (radius: number) => void;
}) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [radiusOpen, setRadiusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const neighborhood = placeNeighborhoodBold(location, chipSlug ?? slug);
  const radiusKey = String(request.radius) as '2' | '5' | '10';

  const share = () => void navigator.clipboard.writeText(window.location.href);

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
        <div className="relative shrink-0">
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
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>New search</Button>
          <Button variant="secondary" size="sm" onClick={share}>Share</Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>Export PDF</Button>
        </div>
        <div className="relative shrink-0 md:hidden" ref={menuRef}>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface-2 text-ink focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="More actions"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 min-w-[10rem] rounded-card border border-border bg-surface py-1 shadow-pop">
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => navigate('/')}>
                New search
              </button>
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={share}>
                Share
              </button>
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => window.print()}>
                Export PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
