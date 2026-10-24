import { useCallback, useRef, useState } from 'react';
import type { AnalysisRequest, AnalysisResponse, AnalysisStep } from '@leaseup/contracts';
import { analyzeWithStream } from '../lib/analyzeStream';
import { apiUrl } from '../lib/api';
import {
  apiErrorFromUnknown,
  parseApiErrorResponse,
  type ApiErrorInfo,
} from '../lib/api-error';
import { fetchWithOneRetry } from '../lib/fetch-with-retry';
import { matchDemoFixtureId } from '../lib/demo-chip-addresses';
import { prefetchDemoReportAnalyze, takePrefetchedDemoAnalyze } from '../lib/report-analyze-prefetch';

export function useAnalysisRun() {
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [autoRetrying, setAutoRetrying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const startedRef = useRef<number>(0);
  const lastRequestRef = useRef<AnalysisRequest | null>(null);

  const run = useCallback(async (request: AnalysisRequest) => {
    lastRequestRef.current = request;
    setLoading(true);
    setError(null);
    setAutoRetrying(false);
    setResults(null);
    setSteps([]);
    setElapsedMs(null);
    setSlowHint(false);
    startedRef.current = performance.now();

    const slowTimer = window.setTimeout(() => setSlowHint(true), 8000);

    let completed = false;
    let errored = false;
    let autoRetried = false;

    const finish = (payload: AnalysisResponse) => {
      completed = true;
      setResults(payload);
      setElapsedMs(Math.round(performance.now() - startedRef.current));
      setLoading(false);
      setAutoRetrying(false);
      window.clearTimeout(slowTimer);
    };

    const demoChip = matchDemoFixtureId(request.address);

    try {
      if (demoChip) {
        prefetchDemoReportAnalyze(request);
        const prefetched = takePrefetchedDemoAnalyze(request);
        if (prefetched) {
          try {
            finish(await prefetched);
            window.clearTimeout(slowTimer);
            return;
          } catch {
            /* fall through to fetch */
          }
        }
        const response = await fetchWithOneRetry(
          apiUrl('/api/analyze'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          },
          {
            onAutoRetry: () => {
              autoRetried = true;
              setAutoRetrying(true);
            },
          }
        );
        if (!response.ok) {
          throw await parseApiErrorResponse(response);
        }
        finish((await response.json()) as AnalysisResponse);
        window.clearTimeout(slowTimer);
        return;
      }

      await analyzeWithStream(request, {
        onStep: (step) => {
          setSteps((prev) => [...prev.filter((s) => s.id !== step.id), step]);
        },
        onComplete: finish,
        onAutoRetry: () => {
          autoRetried = true;
          setAutoRetrying(true);
        },
        onVerification: (payload) => {
          setResults((prev) => (prev ? { ...prev, prospects: payload.prospects } : prev));
          const summary = payload.osmSummary;
          if (summary) {
            setSteps((prev) =>
              prev.map((s) =>
                s.id === 'verify'
                  ? {
                      ...s,
                      status: 'complete',
                      summary: summary.unavailable
                        ? 'OpenStreetMap is not responding, so we are showing results from one source.'
                        : 'OpenStreetMap check complete',
                    }
                  : s
              )
            );
          }
        },
        onError: (info) => {
          errored = true;
          setError({ ...info, autoRetried });
          setLoading(false);
          setAutoRetrying(false);
        },
      });
    } catch {
      /* stream race */
    }

    if (!completed && !errored) {
      try {
        const response = await fetchWithOneRetry(
          apiUrl('/api/analyze'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          },
          {
            onAutoRetry: () => {
              autoRetried = true;
              setAutoRetrying(true);
            },
          }
        );
        if (!response.ok) {
          throw await parseApiErrorResponse(response);
        }
        finish((await response.json()) as AnalysisResponse);
      } catch (err) {
        if (err && typeof err === 'object' && 'message' in err) {
          setError({ ...(err as ApiErrorInfo), autoRetried });
        } else {
          setError(apiErrorFromUnknown(err, autoRetried));
        }
        setLoading(false);
        setAutoRetrying(false);
      }
    }
    window.clearTimeout(slowTimer);
  }, []);

  const retry = useCallback(() => {
    if (lastRequestRef.current) void run(lastRequestRef.current);
  }, [run]);

  return { steps, results, error, autoRetrying, loading, elapsedMs, slowHint, run, retry };
}
