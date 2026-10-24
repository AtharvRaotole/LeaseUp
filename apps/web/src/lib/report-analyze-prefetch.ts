import type { AnalysisRequest } from '@leaseup/contracts';
import { apiUrl } from './api';
import { DEMO_CHIP_ADDRESSES, matchDemoFixtureId, type DemoFixtureId } from './demo-chip-addresses';
import { parseReportSearch } from './report-params';

/** Radius the three demo chip recordings were captured at (keep in sync with the worker). */
export const RECORDED_DEMO_RADIUS_KM = 10;

/**
 * Demo chip reports at the recorded radius with no category filter load from the worker's
 * read-only recorded endpoint (GET, no Qloo, no daily cap). Other searches return null.
 */
export function recordedDemoChipId(request: AnalysisRequest): DemoFixtureId | null {
  if (request.categoryTags && request.categoryTags.length > 0) return null;
  if (request.radius !== RECORDED_DEMO_RADIUS_KM) return null;
  return matchDemoFixtureId(request.address);
}

export function recordedDemoReportUrl(request: AnalysisRequest): string | null {
  const chip = recordedDemoChipId(request);
  if (!chip) return null;
  const params = new URLSearchParams();
  const sqft = request.storefrontSqFt;
  if (sqft !== undefined && Number.isFinite(sqft)) params.set('sqft', String(Math.round(sqft)));
  // Legacy spellings of a chip address keep their own text so saved links match the report.
  const address = request.address.trim();
  if (address !== DEMO_CHIP_ADDRESSES[chip]) params.set('address', address);
  const query = params.toString();
  return apiUrl(`/api/demo-report/${chip}${query ? `?${query}` : ''}`);
}

/** One request per report load: the prefetch started at boot is handed to the report hook. */
const inflight = new Map<string, Promise<Response>>();

function prefetchKey(request: AnalysisRequest) {
  return JSON.stringify(request);
}

export function prefetchDemoReportAnalyze(request: AnalysisRequest) {
  const url = recordedDemoReportUrl(request);
  if (!url) return;
  const key = prefetchKey(request);
  if (inflight.has(key)) return;
  const pending = fetch(url, { method: 'GET' });
  // Keep an unhandled rejection out of the console; the report hook reads the outcome.
  pending.catch(() => undefined);
  inflight.set(key, pending);
}

/** Returns the boot-time recorded report response once, then forgets it. */
export function takePrefetchedDemoAnalyze(request: AnalysisRequest): Promise<Response> | null {
  const key = prefetchKey(request);
  const pending = inflight.get(key);
  if (pending) inflight.delete(key);
  return pending ?? null;
}

/** Fire-and-forget when the app boots on a report URL (overlaps fetch with React mount). */
export function prefetchDemoReportAnalyzeFromLocation() {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith('/r/')) return;
  const request = parseReportSearch(new URLSearchParams(window.location.search));
  if (request) prefetchDemoReportAnalyze(request);
}
