import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AnalysisRequest, AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { brandMonogram, brandTint } from '../../lib/brand-monogram';
import { verificationLabel } from '../../lib/copy';
import { apiUrl } from '../../lib/api';
import { fitPercentileLabel } from '../../lib/fit-display';
import { buildReportPath } from '../../lib/report-params';
import { cn } from '../../lib/cn';

export function BrandsToPitch({
  results,
  request,
  slug,
  selectedId,
  onSelect,
  onDraft,
  radiusKm,
}: {
  results: AnalysisResponse;
  request: AnalysisRequest;
  slug: string;
  selectedId: string | null;
  onSelect: (p: ProspectPack) => void;
  onDraft: (p: ProspectPack) => void;
  radiusKm: number;
}) {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState(results.prospects);
  const [expanded, setExpanded] = useState<string | null>(selectedId);
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

  if (prospects.length === 0) {
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
      <h3 className="mb-4 text-h3 font-semibold text-ink" data-testid="brands-to-pitch">Brands to pitch</h3>
      <div className="space-y-3">
        {prospects.map((prospect, i) => {
          const open = expanded === prospect.brand.entityId;
          const selected = selectedId === prospect.brand.entityId;
          const fitLabel = fitPercentileLabel(prospect.brand.affinityRank, totalScored);
          const category = prospect.tenantMixScore?.categoryFit;

          return (
            <motion.div
              key={prospect.brand.entityId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={cn(
                  'overflow-hidden p-0 ring-1 transition-shadow',
                  selected ? 'ring-accent shadow-sm' : 'ring-transparent'
                )}
              >
                <button
                  type="button"
                  className="flex w-full gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                  onClick={() => {
                    onSelect(prospect);
                    setExpanded(open ? null : prospect.brand.entityId);
                  }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-sm font-semibold text-ink"
                    style={{ background: brandTint(prospect.brand.name) }}
                  >
                    {brandMonogram(prospect.brand.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{prospect.brand.name}</span>
                      {category && (
                        <span className="text-xs text-ink-3">{category}</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{fitLabel}</Badge>
                      <Badge tone="neutral">{verificationLabel(prospect.brand.verified)}</Badge>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                      {prospect.nearestExistingStoreKm !== undefined
                        ? `Closest store ${prospect.nearestExistingStoreKm.toFixed(1)} km away`
                        : `No store within ${radiusKm} km`}
                    </p>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border px-4 pb-4 pt-2 text-sm text-ink-2">
                    {prospect.coverageNote && <p className="mb-2 text-warn">{prospect.coverageNote}</p>}
                    {prospect.qlooSignals?.length && (
                      <p className="mb-2">Signals: {prospect.qlooSignals.join(', ')}</p>
                    )}
                    <ul className="list-disc pl-5 space-y-1">
                      {prospect.reasons.slice(0, 4).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onDraft(prospect)}>
                        Draft outreach email
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
