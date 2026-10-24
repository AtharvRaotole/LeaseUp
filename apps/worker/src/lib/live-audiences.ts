import {
  createBrandExplainabilityStore,
  type BrandExplainabilityStore,
  type LiveAudiencesCompact,
} from '@leaseup/fixtures/worker';

/**
 * Live Qloo audience recordings (PR #114), served from apps/worker/public via ASSETS instead of being
 * bundled. Loaded once per isolate; a failed load is retried on the next request.
 */
let pending: Promise<BrandExplainabilityStore | null> | undefined;

export async function loadLiveAudiences(
  assets: Fetcher | undefined
): Promise<BrandExplainabilityStore | null> {
  if (!assets) return null;
  pending ??= assets
    .fetch('https://osm.local/brand-explainability/live-audiences.compact.json')
    .then((r) => (r.ok ? (r.json() as Promise<LiveAudiencesCompact>) : null))
    .then((data) => (data ? createBrandExplainabilityStore(data) : null))
    .catch(() => null);
  const store = await pending;
  if (!store) pending = undefined;
  return store;
}
