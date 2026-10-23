import { useEffect, useRef, useState, type ReactNode } from 'react';
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
import { verificationShortLabel, verificationSourceHelp } from '../../lib/copy';
import { localFitTooltip } from '../../lib/broker-copy';
import { InfoPopover } from '../ui/InfoPopover';
import { InfoTooltip } from '../ui/InfoTooltip';
import { pitchExpandedLines } from '../../lib/pitch-detail-copy';
import { cn } from '../../lib/cn';
import { AddToPipelineButton } from '../pipeline/AddToPipelineButton';
import { pipelineCardFromProspect } from '../../lib/build-pipeline-card';

const OSM_VERIFY_WAIT_MS = 30_000;

function PitchPill({
  children,
  tone,
  tooltip,
  spinner,
}: {
  children: ReactNode;
  tone: 'accent' | 'neutral';
  tooltip?: string;
  spinner?: boolean;
}) {
  return (
    <span
      title={tooltip}
      className={cn(
        'inline-flex min-h-[22px] max-w-full items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium leading-snug sm:max-w-[10.5rem]',
        tone === 'accent' ? 'bg-accent-soft text-accent' : 'border border-border bg-surface text-ink-2'
      )}
    >
      {spinner && (
        <span
          className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-ink-3 border-t-accent"
          aria-hidden
        />
      )}
      <span className="break-words sm:truncate">{children}</span>
    </span>
  );
}

function verificationPillCopy(
  prospect: ProspectPack,
  entityId: string,
  osmTimedOut: Set<string>,
  radiusKm: number,
  results: AnalysisResponse
): { label: string; help: string; spinner: boolean } {
  const verified = prospect.brand.verified;
  if (verified === 'verifying...' && osmTimedOut.has(entityId)) {
    const osmLabel = results.osmSnapshotLabel ?? 'OpenStreetMap';
    return {
      label: 'One source',
      help: `Checked: All The Places (no store within ${radiusKm} km). Not checked: ${osmLabel} (timed out).`,
      spinner: false,
    };
  }
  return {
    label: verificationShortLabel(verified),
    help: verificationSourceHelp(prospect, radiusKm, results.osmSnapshotLabel, results),
    spinner: verified === 'verifying...',
  };
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
  const [osmTimedOut, setOsmTimedOut] = useState<Set<string>>(() => new Set());
  const [dropNotes, setDropNotes] = useState<Array<{ id: string; brand: string }>>([]);
  const prospectsRef = useRef(prospects);
  prospectsRef.current = prospects;
  const totalScored = results.rankings?.length ?? 100;

  useEffect(() => setProspects(results.prospects), [results.prospects]);

  useEffect(() => {
    if (results.mode !== 'live') return;
    const verifying = results.prospects.filter((p) => p.brand.verified === 'verifying...');
    if (verifying.length === 0) return;

    const verifyingIds = verifying.map((p) => p.brand.entityId);
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      setOsmTimedOut((prev) => {
        const next = new Set(prev);
        for (const id of verifyingIds) next.add(id);
        return next;
      });
    }, OSM_VERIFY_WAIT_MS);

    void fetch(apiUrl('/api/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: results.location, radius: radiusKm, prospects: results.prospects }),
    })
      .then((r) => r.json())
      .then((d: { prospects?: ProspectPack[] }) => {
        if (cancelled || !d.prospects) return;
        window.clearTimeout(timeout);
        const prev = prospectsRef.current;
        const nextIds = new Set(d.prospects.map((p) => p.brand.entityId));
        const dropped = prev.filter(
          (p) => !nextIds.has(p.brand.entityId) && p.brand.verified === 'verifying...'
        );
        if (dropped.length > 0) {
          for (const p of dropped) {
            const id = `${p.brand.entityId}-${Date.now()}`;
            const brand = displayBrandName(p.brand.entityId, p.brand.name);
            setDropNotes((notes) => [{ id, brand }, ...notes]);
            window.setTimeout(() => {
              setDropNotes((notes) => notes.filter((n) => n.id !== id));
            }, 6000);
          }
        }
        setProspects(d.prospects);
        setOsmTimedOut((prev) => {
          const next = new Set(prev);
          for (const id of verifyingIds) next.delete(id);
          return next;
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [results.mode, results.prospects, results.location, radiusKm]);

  if (forceEmpty || prospects.length === 0) {
    return (
      <Card className="text-center" data-testid="brands-to-pitch">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-2">
          <Store className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="mt-4 text-h3 font-semibold text-ink">No pitch list yet</h3>
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
    <section data-testid="brands-to-pitch">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-h3 font-semibold text-ink">Brands to pitch</h3>
        <InfoTooltip label="Brands local shoppers love that we did not find in your trade area." />
      </div>
      {dropNotes.length > 0 && (
        <div className="mb-3 space-y-2" aria-live="polite">
          {dropNotes.map((note) => (
            <p
              key={note.id}
              className="rounded-card border border-border bg-surface-2 px-3 py-2 text-sm text-ink-2 transition-opacity duration-300"
            >
              {note.brand} dropped: found in OpenStreetMap
            </p>
          ))}
        </div>
      )}
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
                    'flex min-h-[56px] w-full flex-col gap-2 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:flex-row sm:items-center sm:gap-3 sm:py-2',
                    selected ? 'bg-surface-2 border-l-2 border-l-accent pl-[10px]' : 'border-l-2 border-l-transparent'
                  )}
                  onClick={() => {
                    onSelect(prospect);
                    setExpanded(open ? null : prospect.brand.entityId);
                  }}
                >
                  <div className="flex min-w-0 w-full items-start gap-3 sm:flex-1">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-xs font-semibold text-ink"
                      style={{ background: brandTint(name) }}
                    >
                      {brandMonogram(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug text-ink">{name}</p>
                      <p className="mt-0.5 text-xs leading-snug text-ink-3">{subline}</p>
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:shrink-0 sm:justify-end">
                    <PitchPill tone="accent" tooltip={localFitTooltip()}>{fitLabel}</PitchPill>
                    {(() => {
                      const pill = verificationPillCopy(
                        prospect,
                        prospect.brand.entityId,
                        osmTimedOut,
                        radiusKm,
                        results
                      );
                      return (
                        <span className="inline-flex items-center gap-0.5">
                          <PitchPill tone="neutral" tooltip={pill.help} spinner={pill.spinner}>
                            {pill.label}
                          </PitchPill>
                          <InfoPopover label={`Store check: ${pill.label}`} body={pill.help} />
                        </span>
                      );
                    })()}
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="primary" onClick={() => onDraft(prospect)}>
                        Draft outreach email
                      </Button>
                      <AddToPipelineButton
                        variant="secondary"
                        buildPayload={() =>
                          pipelineCardFromProspect(prospect, results, {
                            reportPath: buildReportPath(request, slug),
                          })
                        }
                      />
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
