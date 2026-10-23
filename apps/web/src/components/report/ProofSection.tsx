import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { SegmentedControl } from '../ui/SegmentedControl';

export function ProofSection({ results }: { results: AnalysisResponse }) {
  const [mode, setMode] = useState<'raw' | 'blended'>('raw');
  const backtest = mode === 'blended' && results.backtestBlended ? results.backtestBlended : results.backtest;
  const top10 = (results.rankings ?? []).slice(0, 10);
  const present = backtest.presentInTop10 ?? Math.round(backtest.precisionAt10 * 10);

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
              <th className="px-4 py-2 font-medium">Fit</th>
              <th className="px-4 py-2 font-medium">Store nearby</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((row, index) => (
              <motion.tr
                key={row.entityId}
                className="border-t border-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.04 }}
              >
                <td className="px-4 py-3 font-mono tabular-nums text-ink-3">#{row.qlooRank}</td>
                <td className="px-4 py-3 text-ink">{row.name}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink-2">
                  {(row.affinity * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-3">
                  {row.presentInRadius
                    ? `Yes, ${row.nearestStoreKm?.toFixed(1)} km`
                    : 'No'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
