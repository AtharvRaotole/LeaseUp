import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { CompareSlopeChart } from './CompareSlopeChart';

type ComparePayload = {
  left: { name: string };
  right: { name: string };
  flipExamples: Array<{
    entityId: string;
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

  const swings = data.flipExamples
    .slice(0, 8)
    .map((row) => ({
      entityId: row.entityId,
      name: row.name,
      leftRank: row.wickerRank,
      rightRank: row.seviervilleRank,
      delta: row.delta,
    }));

  const recordedDemo = data.source?.toLowerCase().includes('recorded') ?? false;

  return (
    <CompareSlopeChart
      leftName={data.left.name}
      rightName={data.right.name}
      swings={swings}
      recordedDemo={recordedDemo}
    />
  );
}
