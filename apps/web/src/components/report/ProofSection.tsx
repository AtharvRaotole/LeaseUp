import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { affinitiesAllIdentical, fitPercentileLabel } from '../../lib/fit-display';
import { presentInTop10Count } from '../../lib/hit-rate';
import { displayBrandName } from '../../lib/brand-display';
import { rankMovementLabel } from '../../lib/qloo-proof';
export function ProofSection({
  results,
  radiusKm,
  onBrandSelect,
  rankingMode,
}: {
  results: AnalysisResponse;
  radiusKm: number;
  onBrandSelect?: (entityId: string, name: string) => void;
  rankingMode: 'qloo' | 'baseline';
}) {
  const backtest =
    rankingMode === 'baseline' && results.backtestBaseline
      ? results.backtestBaseline
      : results.backtest;
  const top10 = [...(results.rankings ?? [])]
    .sort((a, b) => {
      const rankA = rankingMode === 'baseline' ? (a.baselineRank ?? a.qlooRank) : a.qlooRank;
      const rankB = rankingMode === 'baseline' ? (b.baselineRank ?? b.qlooRank) : b.qlooRank;
      return rankA - rankB;
    })
    .slice(0, 10);
  const present = presentInTop10Count(backtest);
  const totalScored = results.rankings?.length ?? top10.length;
  const hideFit = useMemo(() => affinitiesAllIdentical(top10), [top10]);

  return (
    <section>
      <h3 className="text-h3 font-semibold text-ink">Does the taste signal match reality?</h3>
      <p className="mt-2 text-sm text-ink-2">
        Hit rate {present} of 10: top ranked brands that already have a store within {radiusKm} km.
      </p>
      <Card className="mt-4 overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-label uppercase text-ink-3">
            <tr>
              <th className="px-4 py-2 font-medium">Rank</th>
              <th className="px-4 py-2 font-medium">Brand</th>
              {!hideFit && rankingMode === 'qloo' && (
                <th className="px-4 py-2 font-medium">Fit</th>
              )}
              <th className="px-4 py-2 font-medium">Movement</th>
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
                <td className="px-4 py-3 font-mono tabular-nums text-ink-2">
                  #
                  {rankingMode === 'baseline'
                    ? row.baselineRank ?? row.qlooRank
                    : row.qlooRank}
                </td>
                <td className="px-4 py-3 text-ink">{displayBrandName(row.entityId, row.name)}</td>
                {!hideFit && rankingMode === 'qloo' && (
                  <td className="px-4 py-3 font-mono tabular-nums text-ink-2">
                    {fitPercentileLabel(row.qlooRank, totalScored)}
                  </td>
                )}
                <td className="px-4 py-3 text-xs text-ink-2">
                  {row.baselineRank !== undefined
                    ? rankMovementLabel(row.qlooRank, row.baselineRank)
                    : 'n/a'}
                </td>
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
