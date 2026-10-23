import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

type ComparePayload = {
  left: { name: string; top: Array<{ name: string; qlooRank: number; affinity: number }> };
  right: { name: string; top: Array<{ name: string; qlooRank: number; affinity: number }> };
  flipExamples: Array<{
    name: string;
    wickerRank: number;
    seviervilleRank: number;
    delta: number;
  }>;
  source: string;
};

export function CompareFlip() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['compare-flip'],
    queryFn: async () => {
      const res = await fetch('/api/compare/flip');
      if (!res.ok) throw new Error('Failed to load compare data');
      return res.json() as Promise<ComparePayload>;
    },
  });

  if (isLoading) {
    return <div className="glass rounded-2xl p-6 text-zinc-400 text-sm">Loading taste contrast…</div>;
  }

  if (error || !data) {
    return (
      <div className="glass rounded-2xl p-6 text-red-300 text-sm">
        Could not load compare mode: {(error as Error)?.message}
      </div>
    );
  }

  return (
    <section className="glass rounded-2xl p-6">
      <h3 className="text-lg font-semibold mb-1">The flip — same brands, different taste</h3>
      <p className="text-sm text-zinc-400 mb-6">
        Qloo taste ≠ demographics. {data.source}.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <RankColumn title={data.left.name} rows={data.left.top} />
        <RankColumn title={data.right.name} rows={data.right.top} />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Biggest rank swings</p>
        {data.flipExamples.map((row, i) => (
          <motion.div
            key={row.name}
            className="flex items-center justify-between text-sm border border-surface-border rounded-lg px-3 py-2"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <span className="font-medium">{row.name}</span>
            <span className="text-zinc-400">
              #{row.wickerRank} Wicker · #{row.seviervilleRank} Sevierville
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function RankColumn({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; qlooRank: number; affinity: number }>;
}) {
  return (
    <div className="rounded-xl border border-surface-border p-4 bg-black/20">
      <p className="text-sm font-semibold mb-3">{title}</p>
      <ol className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.name} className="flex justify-between gap-2">
            <span>#{row.qlooRank} {row.name}</span>
            <span className="text-zinc-500">{(row.affinity * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
