import { meterSubrequest, recordOffload, type SubrequestCounts } from './subrequest-meter';

/**
 * Loopback offload for live prospecting runs.
 *
 * Workers Free caps each invocation at 50 subrequests. A call through a service binding
 * to this same Worker (ctx.exports loopback) costs the caller one subrequest and runs as
 * its own invocation with its own budget. Service bindings are free on every plan.
 * The binding is not reachable from the public internet; only this Worker can call it.
 */
export const LIVE_OFFLOAD_ORIGIN = 'https://leaseup-offload.internal';

export type LiveOffloadOp = 'trade-area-taste' | 'co-tenancy' | 'review-drafts';

export const LIVE_OFFLOAD_OPS: readonly LiveOffloadOp[] = [
  'trade-area-taste',
  'co-tenancy',
  'review-drafts',
];

export interface LiveOffloadResponse<T> {
  ok: boolean;
  result?: T;
  error?: string;
  counts?: SubrequestCounts;
}

/**
 * Returns undefined when no binding is available (callers then run inline) and
 * `{ failed: true }` when the offload ran but failed (callers then degrade honestly
 * instead of retrying inline and blowing the caller's budget).
 */
export async function callLiveOffload<T>(
  binding: Fetcher | undefined,
  op: LiveOffloadOp,
  payload: unknown
): Promise<{ failed: false; result: T } | { failed: true; error: string } | undefined> {
  if (!binding) return undefined;
  meterSubrequest('loopback');
  try {
    const res = await binding.fetch(`${LIVE_OFFLOAD_ORIGIN}/${op}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as LiveOffloadResponse<T>;
    recordOffload({ op, ok: body.ok === true, total: body.counts?.total });
    if (!res.ok || !body.ok || body.result === undefined) {
      return { failed: true, error: body.error ?? `offload ${op} returned ${res.status}` };
    }
    return { failed: false, result: body.result };
  } catch (error) {
    recordOffload({ op, ok: false });
    return { failed: true, error: (error as Error).message };
  }
}

/** ctx.exports.LiveOffload when the runtime provides it (enable_ctx_exports), else undefined. */
export function liveOffloadBinding(getCtx: () => unknown): Fetcher | undefined {
  try {
    const ctx = getCtx() as { exports?: { LiveOffload?: Fetcher } } | undefined;
    return ctx?.exports?.LiveOffload;
  } catch {
    return undefined;
  }
}
