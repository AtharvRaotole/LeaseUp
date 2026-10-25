import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-invocation subrequest meter for live prospecting runs.
 *
 * Workers Free allows 50 subrequests per invocation (external fetch, Cache API,
 * and in this app the static asset fetches are counted too, to stay conservative).
 * The meter only counts work started inside withSubrequestMeter, so other routes are untouched.
 */
export interface SubrequestCounts {
  fetch: number;
  cache: number;
  assets: number;
  loopback: number;
  total: number;
  /** Separate Worker invocations this run started through the loopback binding. */
  offloads?: OffloadReceipt[];
}

export interface OffloadReceipt {
  op: string;
  ok: boolean;
  /** Subrequests the offload invocation used inside its own 50 budget. */
  total?: number;
}

export type SubrequestKind = 'fetch' | 'cache' | 'assets' | 'loopback';

const storage = new AsyncLocalStorage<SubrequestCounts>();
let fetchWrapped = false;

function emptyCounts(): SubrequestCounts {
  return { fetch: 0, cache: 0, assets: 0, loopback: 0, total: 0 };
}

export function meterSubrequest(kind: SubrequestKind): void {
  const counts = storage.getStore();
  if (!counts) return;
  counts[kind] += 1;
  counts.total += 1;
}

/** Wrap global fetch once so every outbound fetch inside a metered run is counted. */
function ensureFetchWrapped(): void {
  if (fetchWrapped) return;
  const original = globalThis.fetch;
  if (typeof original !== 'function') return;
  const wrapped: typeof fetch = (input, init) => {
    meterSubrequest('fetch');
    return original(input, init);
  };
  globalThis.fetch = wrapped;
  fetchWrapped = true;
}

export async function withSubrequestMeter<T>(
  fn: () => Promise<T>
): Promise<{ result: T; counts: SubrequestCounts }> {
  ensureFetchWrapped();
  const counts = emptyCounts();
  const result = await storage.run(counts, fn);
  return {
    result,
    counts: { ...counts, offloads: counts.offloads ? [...counts.offloads] : undefined },
  };
}

export function recordOffload(receipt: OffloadReceipt): void {
  const counts = storage.getStore();
  if (!counts) return;
  counts.offloads = [...(counts.offloads ?? []), receipt];
}

export function currentSubrequestCounts(): SubrequestCounts | undefined {
  const counts = storage.getStore();
  return counts
    ? { ...counts, offloads: counts.offloads ? [...counts.offloads] : undefined }
    : undefined;
}
