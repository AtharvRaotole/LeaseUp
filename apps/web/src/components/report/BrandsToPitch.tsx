import { useEffect, useState, type ReactNode } from 'react';
import { Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AnalysisRequest, AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { brandMonogram, brandTint } from '../../lib/brand-monogram';
import { apiUrl } from '../../lib/api';
import { fitPercentileLabel } from '../../lib/fit-display';
import { buildReportPath } from '../../lib/report-params';
import { displayBrandName } from '../../lib/brand-display';
import { brandCategoryLabel } from '../../lib/brand-category';
import { verificationShortLabel, verificationTooltip } from '../../lib/copy';
import { pitchExpandedLines } from '../../lib/pitch-detail-copy';
import { cn } from '../../lib/cn';

function PitchPill({
  children,
  tone,
  title,
}: {
  children: ReactNode;
  tone: 'accent' | 'neutral';
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-[22px] max-w-[8.5rem] items-center truncate rounded-pill px-2 text-[11px] font-medium leading-none',
        tone === 'accent' ? 'bg-accent-soft text-accent' : 'border border-border bg-surface text-ink-2'
      )}
    >
      {children}
    </span>
  );
}

export function BrandsToPitch({
  results,
  request,
  slug,
  selectedId,
  onSelect,
  onDraft,
  radiusKm,
  forceEmpty,
}: {
  results: AnalysisResponse;
  request: AnalysisRequest;
  slug: string;
  selectedId: string | null;
  onSelect: (p: ProspectPack) => void;
  onDraft: (p: ProspectPack) => void;
  radiusKm: number;
  forceEmpty?: boolean;
}) {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState(results.prospects);
  const [expanded, setExpanded] = useState<string | null>(null);
  const totalScored = results.rankings?.length ?? 100;

  useEffect(() => setProspects(results.prospects), [results.prospects]);

  useEffect(() => {
    if (results.mode !== 'live') return;
    if (!results.prospects.some((p) => p.brand.verified === 'verifying...')) return;
    void fetch(apiUrl('/api/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: results.location, radius: radiusKm, prospects: results.prospects }),
    })
      .then((r) => r.json())
      .then((d: { prospects?: ProspectPack[] }) => {
        if (d.prospects) setProspects(d.prospects);
      })
      .catch(() => undefined);
  }, [results, radiusKm]);

  if (forceEmpty || prospects.length === 0) {
    return (
      <Card className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-2">
          <Store className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="mt-4 text-h3 font-semibold text-ink" data-testid="brands-to-pitch">No pitch list yet</h3>
        <p className="mt-2 text-sm text-ink-2">
          Every top brand already has a store in this radius. Try a wider search or narrow by category.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              navigate(buildReportPath({ ...request, radius: 5 }, slug), { replace: true })
            }
          >
            Try 5 km
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            Pick a category
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <section>
      <h3 className="mb-3 text-h3 font-semibold text-ink" data-testid="brands-to-pitch">Brands to pitch</h3>
      <Card className="overflow-hidden p-0">
        <ul className="divide-y divide-border">
          {prospects.map((prospect) => {
            const open = expanded === prospect.brand.entityId;
            const selected = selectedId === prospect.brand.entityId;
            const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
            const fitLabel = fitPercentileLabel(prospect.brand.affinityRank, totalScored);
            const category =
              prospect.tenantMixScore?.categoryFit ?? brandCategoryLabel(prospect.brand.entityId);
            const distanceLine = prospect.nearestExistingStoreKm !== undefined
              ? `Closest store ${prospect.nearestExistingStoreKm.toFixed(1)} km`
              : `No store within ${radiusKm} km`;
            const subline = category ? `${category} · ${distanceLine}` : distanceLine;

            return (
              <li key={prospect.brand.entityId}>
                <button
                  type="button"
                  className={cn(
                    'flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                    selected ? 'bg-surface-2 border-l-2 border-l-accent pl-[10px]' : 'border-l-2 border-l-transparent'
                  )}
                  onClick={() => {
                    onSelect(prospect);
                    setExpanded(open ? null : prospect.brand.entityId);
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-xs font-semibold text-ink"
                    style={{ background: brandTint(name) }}
                  >
                    {brandMonogram(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-snug text-ink md:line-clamp-1 md:truncate">{name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-3">{subline}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <PitchPill tone="accent">{fitLabel}</PitchPill>
                    <PitchPill tone="neutral" title={verificationTooltip(prospect.brand.verified, radiusKm)}>
                      {verificationShortLabel(prospect.brand.verified)}
                    </PitchPill>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border bg-surface-2/40 px-4 py-3 text-sm text-ink-2">
                    <ul className="space-y-2">
                      {pitchExpandedLines(prospect, results, radiusKm).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    {prospect.coverageNote && (
                      <p className="mt-2 text-xs text-warn">{prospect.coverageNote}</p>
                    )}
                    <div className="mt-4">
                      <Button size="sm" variant="primary" onClick={() => onDraft(prospect)}>
                        Draft outreach email
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
