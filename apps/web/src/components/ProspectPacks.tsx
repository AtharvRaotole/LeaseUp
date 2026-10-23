import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { apiUrl } from '../lib/api';

interface ProspectPacksProps {
  results: AnalysisResponse;
  selectedId: string | null;
  onSelect: (pack: ProspectPack) => void;
}

export function ProspectPacks({ results, selectedId, onSelect }: ProspectPacksProps) {
  const [prospects, setProspects] = useState(results.prospects);

  useEffect(() => {
    setProspects(results.prospects);
  }, [results.prospects]);

  useEffect(() => {
    if (results.mode !== 'live') return;
    if (!prospects.some((p) => p.brand.verified === 'verifying...')) return;

    void fetch(apiUrl('/api/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: results.location,
        radius: 10,
        prospects,
      }),
    })
      .then((res) => res.json())
      .then((data: { prospects?: typeof prospects }) => {
        if (data.prospects) setProspects(data.prospects);
      })
      .catch(() => undefined);
  }, [results.mode, results.location, prospects]);

  const outreach = useMutation({
    mutationFn: async (prospect: ProspectPack) => {
      const res = await fetch(apiUrl('/api/outreach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: prospect.brand.name,
          address: results.location.resolvedAddress || results.location.address,
          reasons: prospect.reasons,
          runId: results.runId,
          affinityRank: prospect.brand.affinityRank,
          neighborhood: results.location.neighborhood || results.location.city,
          nearestStoreKm: prospect.nearestExistingStoreKm,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Outreach failed');
      }
      return (await res.json()) as { draft: string };
    },
  });

  const printPack = () => {
    window.print();
  };

  return (
    <section className="glass rounded-2xl p-6 print-pack" id="prospect-pack-print">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
        <h3 className="text-lg font-semibold">Prospect packs — not here yet</h3>
        <button
          type="button"
          onClick={printPack}
          className="text-sm px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-muted"
        >
          Export printable pack
        </button>
      </div>

      {prospects.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No high-confidence absent brands passed filters. Try another address or widen radius.
        </p>
      ) : (
        <div className="space-y-4">
          {prospects.map((prospect, index) => {
            const selected = selectedId === prospect.brand.entityId;
            return (
              <motion.article
                key={prospect.brand.entityId}
                layout
                className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                  selected ? 'border-accent bg-accent/5' : 'border-surface-border bg-black/20'
                }`}
                onClick={() => onSelect(prospect)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h4 className="font-semibold">{prospect.brand.name}</h4>
                  <span className="text-xs text-zinc-400">
                    Rank #{prospect.brand.affinityRank} · {(prospect.brand.affinity * 100).toFixed(0)}% affinity
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{prospect.brand.verified}</p>
                {prospect.qlooSignals && prospect.qlooSignals.length > 0 && (
                  <p className="text-xs text-zinc-400 mt-2">Qloo: {prospect.qlooSignals.join(' · ')}</p>
                )}
                {prospect.nearestExistingStoreKm !== undefined && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Nearest existing store: {prospect.nearestExistingStoreKm.toFixed(1)} km away
                  </p>
                )}
                <ul className="list-disc pl-5 text-sm text-zinc-300 mt-3 space-y-1">
                  {prospect.reasons.slice(0, 4).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <div className="mt-3 no-print">
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded border border-surface-border hover:border-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      outreach.mutate(prospect);
                    }}
                  >
                    {outreach.isPending ? 'Drafting…' : 'Generate outreach draft'}
                  </button>
                  {outreach.data?.draft && selected && (
                    <pre className="mt-3 text-xs bg-black/40 p-3 rounded whitespace-pre-wrap">
                      {outreach.data.draft}
                    </pre>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}
