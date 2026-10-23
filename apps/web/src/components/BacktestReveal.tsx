import { motion } from 'framer-motion';
import type { AnalysisResponse, BrandRankingRow } from '@leaseup/contracts';

interface BacktestRevealProps {
  results: AnalysisResponse;
}

export function BacktestReveal({ results }: BacktestRevealProps) {
  const top10 = (results.rankings ?? []).slice(0, 10);
  const raw = results.backtest;
  const blended = results.backtestBlended;

  return (
    <section className="glass rounded-2xl p-6 shadow-glow">
      <h3 className="text-lg font-semibold mb-2">We hid the stores — can Qloo find them?</h3>
      <p className="text-sm text-zinc-400 mb-6">
        Each top-10 brand flips to a check if All The Places shows a real store within {results.location.address ? 'your radius' : '10km'}.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <ScoreCard title="Raw Qloo ranking" backtest={raw} />
        {blended && <ScoreCard title="Blended (+ national prior)" backtest={blended} />}
      </div>

      <ul className="space-y-2">
        {top10.map((row, index) => (
          <RevealRow key={row.entityId} row={row} index={index} />
        ))}
      </ul>

      <p className="text-xs text-zinc-500 mt-4">
        {plainEnglish(raw)}
      </p>
    </section>
  );
}

function ScoreCard({
  title,
  backtest,
}: {
  title: string;
  backtest: AnalysisResponse['backtest'];
}) {
  return (
    <div className="rounded-xl border border-surface-border p-4 bg-black/20">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">P@10 {(backtest.precisionAt10 * 100).toFixed(0)}%</p>
      <p className="text-sm text-zinc-400">AUC {backtest.auc?.toFixed(3) ?? '—'}</p>
      <p className="text-xs text-zinc-500 mt-1">{backtest.presentInTop10 ?? 0}/10 in top 10 present</p>
    </div>
  );
}

function RevealRow({ row, index }: { row: BrandRankingRow; index: number }) {
  return (
    <motion.li
      className="flex items-center justify-between rounded-lg border border-surface-border px-4 py-3 bg-black/30"
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
    >
      <div className="flex items-center gap-3">
        <span className="text-zinc-500 w-6">#{row.qlooRank}</span>
        <span className="font-medium">{row.name}</span>
      </div>
      <motion.span
        className={`text-sm font-medium px-2 py-1 rounded ${row.presentInRadius ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}
        animate={{ scale: row.presentInRadius ? [1, 1.08, 1] : 1 }}
        transition={{ delay: index * 0.08 + 0.2 }}
      >
        {row.presentInRadius ? `✓ ${row.nearestStoreKm?.toFixed(1)} km` : 'Absent'}
      </motion.span>
    </motion.li>
  );
}

function plainEnglish(backtest: AnalysisResponse['backtest']): string {
  const p10 = Math.round(backtest.precisionAt10 * 100);
  const auc = backtest.auc?.toFixed(2) ?? 'n/a';
  return `${p10}% of Qloo's top-10 brands actually have a store nearby (AUC ${auc}).`;
}
