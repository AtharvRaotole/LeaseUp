import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { ShowMethod } from '../ui/ShowMethod';
import { affinitiesAllIdentical, fitPercentileLabel } from '../../lib/fit-display';
import { presentInTop10Count } from '../../lib/hit-rate';
import {
  proofSectionLead,
  movementColumnTooltip,
  storeNearbyColumnTooltip,
  localFitTooltip,
} from '../../lib/broker-copy';
import { InfoTooltip } from '../ui/InfoTooltip';
import { InfoPopover } from '../ui/InfoPopover';
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
  const adaptiveKm = results.strictEval?.adaptiveRadiusKm;
  const randomPanel = results.strictEval?.panels?.find(
    (p) => p.randomExpected !== undefined || p.randomMonteCarlo !== undefined
  );
  const randomValue = randomPanel?.randomExpected ?? randomPanel?.randomMonteCarlo;
  const randomLine =
    randomValue !== undefined
      ? `Random baseline ~${randomValue.toFixed(1)} of 10${
          adaptiveKm ? ` at ${adaptiveKm} km adaptive radius` : ''
        }.`
      : null;

  return (
    <section>
      <h3 className="text-h3 font-semibold text-ink">Do the rankings match what is on the ground?</h3>
      <p className="mt-2 text-sm text-ink-2">
        {proofSectionLead(present, adaptiveKm ?? radiusKm)}
        {randomLine ? ` ${randomLine}` : ''}
      </p>
      <ShowMethod>
        <p>
          We compare taste-ordered (or chain-size-ordered) rankings with All The Places store
          locations inside your radius. {(backtest.precisionAt10 * 100).toFixed(0)}% of the top 10
          already have a store nearby.
          {backtest.auc !== undefined &&
            ` Separation score ${backtest.auc.toFixed(2)}: how often a brand with a nearby store ranks above one without (1.0 is a perfect match).`}
          {' '}
          When the top-10 match rate maxes out, we also score at an adaptive radius.
        </p>
      </ShowMethod>
      <Card className="mt-4 overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-label uppercase text-ink-3">
            <tr>
              <th className="px-4 py-2 font-medium">Rank</th>
              <th className="px-4 py-2 font-medium">Brand</th>
              {!hideFit && rankingMode === 'qloo' && (
                <th className="px-4 py-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Local fit
                    <InfoTooltip label={localFitTooltip()} />
                  </span>
                </th>
              )}
              <th className="px-4 py-2 font-medium">
                <span className="inline-flex items-center gap-1">
                  vs chain size
                  <InfoTooltip label={movementColumnTooltip()} />
                </span>
              </th>
              <th className="px-4 py-2 font-medium">
                <span className="inline-flex items-center gap-1">
                  Store nearby
                  <InfoTooltip label={storeNearbyColumnTooltip(radiusKm)} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody data-testid="proof-ranking-table">
            {top10.map((row, index) => (
              <motion.tr
                key={row.entityId}
                data-testid={`proof-ranking-row-${index}`}
                className="border-t border-border cursor-pointer hover:bg-surface-2/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => onBrandSelect?.(row.entityId, row.name)}
              >
                <td className="px-4 py-3 tabular-nums text-ink-2">
                  #
                  {rankingMode === 'baseline'
                    ? row.baselineRank ?? row.qlooRank
                    : row.qlooRank}
                </td>
                <td className="px-4 py-3 text-ink">
                  {displayBrandName(row.entityId, row.name)}
                  {row.chainSizeTier === 'big' && (
                    <span className="ml-2 text-xs text-ink-3">(size-driven)</span>
                  )}
                </td>
                {!hideFit && rankingMode === 'qloo' && (
                  <td className="px-4 py-3 tabular-nums text-ink-2">
                    {fitPercentileLabel(row.blendedRank, totalScored)}
                  </td>
                )}
                <td className="px-4 py-3 text-xs text-ink-2">
                  <span className="inline-flex items-center gap-1">
                    {row.baselineRank !== undefined
                      ? rankMovementLabel(row.qlooRank, row.baselineRank)
                      : 'n/a'}
                    {row.baselineRank !== undefined && (
                      <InfoPopover
                        label="Rank change with taste"
                        body={movementColumnTooltip()}
                      />
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.presentInRadius && row.nearestStoreKm !== undefined ? (
                    <span className="inline-flex items-center gap-1.5 text-success">
                      <Check className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="tabular-nums">{row.nearestStoreKm.toFixed(1)} km</span>
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
