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

export function isComparePayload(value: unknown): value is ComparePayload {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  const left = d.left;
  const right = d.right;
  if (!left || typeof left !== 'object' || typeof (left as { name?: unknown }).name !== 'string') {
    return false;
  }
  if (!right || typeof right !== 'object' || typeof (right as { name?: unknown }).name !== 'string') {
    return false;
  }
  return Array.isArray(d.flipExamples);
}

export async function fetchCompareFlipData(
  fetchImpl: typeof fetch,
  url: string
): Promise<{ ok: true; data: ComparePayload } | { ok: false }> {
  const r = await fetchImpl(url);
  if (!r.ok) return { ok: false };
  const body: unknown = await r.json();
  if (!isComparePayload(body)) return { ok: false };
  return { ok: true, data: body };
}

export function CompareUnavailable() {
  return (
    <section>
      <h3 className="text-h3 font-semibold text-ink">Same brands, different places.</h3>
      <p className="mt-2 text-sm text-ink-2">Comparison unavailable right now.</p>
    </section>
  );
}

export function CompareSection() {
  const [data, setData] = useState<ComparePayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchCompareFlipData(fetch, apiUrl('/api/compare/flip'))
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setData(result.data);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <CompareUnavailable />;
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
