import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';

type ComparePayload = {
  left: { name: string };
  right: { name: string };
  flipExamples: Array<{
    name: string;
    wickerRank: number;
    seviervilleRank: number;
    delta: number;
  }>;
  source?: string;
};

export function CompareSection() {
  const [data, setData] = useState<ComparePayload | null>(null);

  useEffect(() => {
    void fetch(apiUrl('/api/compare/flip'))
      .then((r) => r.json())
      .then((d) => setData(d as ComparePayload))
      .catch(() => undefined);
  }, []);

  if (!data) return null;

  const swings = data.flipExamples.slice(0, 8);

  return (
    <section>
      <h3 className="text-h3 font-semibold text-ink">Same brands, different places.</h3>
      <p className="mt-2 text-sm text-ink-2">
        {data.left.name} vs {data.right.name}
        {data.source ? ` (${data.source})` : ''}
      </p>
      <div className="mt-4 space-y-3">
        {swings.map((row) => (
          <div key={row.name} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-sm">
            <span className="font-mono tabular-nums text-ink-2 text-right">#{row.wickerRank}</span>
            <span className="font-medium text-ink text-center">{row.name}</span>
            <span className="font-mono tabular-nums text-ink-2">#{row.seviervilleRank}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
