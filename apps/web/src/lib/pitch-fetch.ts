import type { PitchPackSnapshot } from '@leaseup/contracts';
import { apiUrl } from './api';

export type PitchFetchResult =
  | { kind: 'ok'; snapshot: PitchPackSnapshot }
  | { kind: 'not-found' }
  | { kind: 'failed' };

export const PITCH_FETCH_RETRY_DELAY_MS = 800;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Load a shared pitch. A network error or 5xx gets one quiet retry before the page
 * shows its error state; a 404 is final.
 */
export async function fetchPitchSnapshot(
  id: string,
  opts: { retries?: number; retryDelayMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<PitchFetchResult> {
  const retries = opts.retries ?? 1;
  const retryDelayMs = opts.retryDelayMs ?? PITCH_FETCH_RETRY_DELAY_MS;
  const doFetch = opts.fetchImpl ?? fetch;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await wait(retryDelayMs);
    try {
      const res = await doFetch(apiUrl(`/api/pitch/${encodeURIComponent(id)}`));
      if (res.status === 404) return { kind: 'not-found' };
      if (res.ok) {
        const snapshot = (await res.json()) as PitchPackSnapshot;
        if (snapshot && Array.isArray(snapshot.prospects)) return { kind: 'ok', snapshot };
      }
    } catch {
      // Network error or bad JSON: fall through to the retry.
    }
  }
  return { kind: 'failed' };
}
