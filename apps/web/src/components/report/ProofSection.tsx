import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { SegmentedControl } from '../ui/SegmentedControl';
import { affinitiesAllIdentical, fitPercentileLabel } from '../../lib/fit-display';
import { presentInTop10Count } from '../../lib/hit-rate';
import { displayBrandName } from '../../lib/brand-display';
export function ProofSection({
  results,
  radiusKm,
  onBrandSelect,
}: {
  results: AnalysisResponse;
  radiusKm: number;
  onBrandSelect?: (entityId: string, name: string) => void;
}) {
  const [mode, setMode] = useState<'raw' | 'blended'>('raw');
  const backtest = mode === 'blended' && results.backtestBlended ? results.backtestBlended : results.backtest;
  const top10 = (results.rankings ?? []).slice(0, 10);
  const present = presentInTop10Count(backtest);
  const totalScored = results.rankings?.length ?? top10.length;
  const hideFit = useMemo(() => affinitiesAllIdentical(top10), [top10]);

  return (
    <section>
      <h3 className="text-h3 font-semibold text-ink">Does the taste signal match reality?</h3>
      <p className="mt-2 text-sm text-ink-2">
        Hit rate {present} of 10: Qloo's strongest local brands that already have a store nearby.
      </p>
      <div className="mt-4">
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: 'raw', label: 'Qloo only' },
            { value: 'blended', label: 'Qloo + chain size' },
          ]}
        />
        <p className="mt-2 text-meta text-ink-3">
          Blended reorders by national footprint to reduce one-off spikes.
        </p>
      </div>
      <Card className="mt-4 overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-label uppercase text-ink-3">
            <tr>
              <th className="px-4 py-2 font-medium">Rank</th>
              <th className="px-4 py-2 font-medium">Brand</th>
              {!hideFit && <th className="px-4 py-2 font-medium">Fit</th>}
              <th className="px-4 py-2 font-medium">Store nearby</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((row, index) => (
              <motion.tr
                key={row.entityId}
                className="border-t border-border cursor-pointer hover:bg-surface-2/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => onBrandSelect?.(row.entityId, row.name)}
              >
                <td className="px-4 py-3 font-mono tabular-nums text-ink-2">#{row.qlooRank}</td>
                <td className="px-4 py-3 text-ink">{displayBrandName(row.entityId, row.name)}</td>
                {!hideFit && (
                  <td className="px-4 py-3 font-mono tabular-nums text-ink-2">
                    {fitPercentileLabel(row.qlooRank, totalScored)}
                  </td>
                )}
                <td className="px-4 py-3">
                  {row.presentInRadius && row.nearestStoreKm !== undefined ? (
                    <span className="inline-flex items-center gap-1.5 text-success">
                      <Check className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="font-mono tabular-nums">{row.nearestStoreKm.toFixed(1)} km</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-ink-3">
                      <X className="h-4 w-4 shrink-0" aria-hidden />
                      None within {radiusKm} km
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
