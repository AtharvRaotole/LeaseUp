import type { AnalysisRequest, AnalysisResponse } from '@leaseup/contracts';
import { apiUrl } from './api';
import { matchDemoFixtureId } from './demo-chip-addresses';
import { parseReportSearch } from './report-params';

const inflight = new Map<string, Promise<AnalysisResponse>>();

function prefetchKey(request: AnalysisRequest) {
  return JSON.stringify(request);
}

export function prefetchDemoReportAnalyze(request: AnalysisRequest) {
  if (!matchDemoFixtureId(request.address)) return;
  const key = prefetchKey(request);
  if (inflight.has(key)) return;
  inflight.set(
    key,
    fetch(apiUrl('/api/analyze'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(async (res) => {
      if (!res.ok) throw new Error('prefetch analyze failed');
      return (await res.json()) as AnalysisResponse;
    })
  );
}

export function takePrefetchedDemoAnalyze(
  request: AnalysisRequest
): Promise<AnalysisResponse> | null {
  if (!matchDemoFixtureId(request.address)) return null;
  const key = prefetchKey(request);
  const pending = inflight.get(key);
  if (pending) inflight.delete(key);
  return pending ?? null;
}

/** Fire-and-forget when the report route chunk loads (overlaps fetch with React mount). */
export function prefetchDemoReportAnalyzeFromLocation() {
  if (typeof window === 'undefined') return;
  const request = parseReportSearch(new URLSearchParams(window.location.search));
  if (request) prefetchDemoReportAnalyze(request);
}
