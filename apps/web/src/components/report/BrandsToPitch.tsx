import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { brandMonogram, brandTint } from '../../lib/brand-monogram';
import { verificationLabel } from '../../lib/copy';
import { apiUrl } from '../../lib/api';

export function BrandsToPitch({
  results,
  selectedId,
  onSelect,
  onDraft,
  radiusKm,
}: {
  results: AnalysisResponse;
  selectedId: string | null;
  onSelect: (p: ProspectPack) => void;
  onDraft: (p: ProspectPack) => void;
  radiusKm: number;
}) {
  const [prospects, setProspects] = useState(results.prospects);
  const [expanded, setExpanded] = useState<string | null>(selectedId);

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
      <Card>
        <h3 className="text-h3 font-semibold" data-testid="brands-to-pitch">Brands to pitch</h3>
        <p className="mt-3 text-ink-2">
          Every top brand already has a store here. That is a strong, saturated block. Try a larger radius or a category.
        </p>
      </Card>
    );
  }

  return (
    <section>
      <h3 className="mb-4 text-h3 font-semibold text-ink" data-testid="brands-to-pitch">Brands to pitch</h3>
      <div className="space-y-3">
        {prospects.map((prospect, i) => {
          const open = expanded === prospect.brand.entityId;
          const pct = Math.max(1, Math.round((1 - (prospect.brand.affinityRank - 1) / 50) * 100));
          return (
            <motion.div key={prospect.brand.entityId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-0 overflow-hidden">
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
                      <Badge tone="accent">Top {Math.min(99, pct)}% fit</Badge>
                      <Badge tone="neutral">{verificationLabel(prospect.brand.verified)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-2">
                      {prospect.nearestExistingStoreKm !== undefined
                        ? `Closest: ${prospect.nearestExistingStoreKm.toFixed(1)} km`
                        : 'No store in radius'}
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
