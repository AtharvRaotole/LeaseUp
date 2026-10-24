import { useCallback, useRef, useState } from 'react';
import type { AnalysisRequest, AnalysisResponse, AnalysisStep } from '@leaseup/contracts';
import { analyzeWithStream } from '../lib/analyzeStream';
import { apiUrl } from '../lib/api';
import {
  apiErrorFromUnknown,
  parseApiErrorResponse,
  type ApiErrorInfo,
} from '../lib/api-error';
import {
  fetchWithOneRetry,
  isNetworkFetchError,
  isRetryableHttpStatus,
} from '../lib/fetch-with-retry';
import { matchDemoFixtureId } from '../lib/demo-chip-addresses';
import {
  recordedDemoReportUrl,
  takePrefetchedDemoAnalyze,
} from '../lib/report-analyze-prefetch';

const PREFETCH_RETRY_DELAY_MS = 1600;

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

    const recordedUrl = recordedDemoReportUrl(request);
    const demoChip = matchDemoFixtureId(request.address);
    const onAutoRetry = () => {
      autoRetried = true;
      setAutoRetrying(true);
    };

    // Demo chips make exactly one request per load. A failure here is final for this run:
    // it must not fall through to the stream or POST fallback below (that tripled the
    // POSTs to /api/analyze when the daily cap returned 429).
    if (recordedUrl || demoChip) {
      const url = recordedUrl ?? apiUrl('/api/analyze');
      const init: RequestInit = recordedUrl
        ? { method: 'GET' }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          };
      const fetchOnce = () => fetchWithOneRetry(url, init, { onAutoRetry });
      /** The boot prefetch already counted as the first try, so this is the one retry. */
      const retryAfterPrefetch = async () => {
        onAutoRetry();
        await new Promise((resolve) => window.setTimeout(resolve, PREFETCH_RETRY_DELAY_MS));
        return fetch(url, init);
      };
      try {
        const prefetched = recordedUrl ? takePrefetchedDemoAnalyze(request) : null;
        let response: Response;
        if (prefetched) {
          try {
            response = await prefetched;
          } catch (err) {
            if (!isNetworkFetchError(err)) throw err;
            response = await retryAfterPrefetch();
          }
          if (isRetryableHttpStatus(response.status)) {
            response = await retryAfterPrefetch();
          }
        } else {
          response = await fetchOnce();
        }
        if (!response.ok) {
          throw await parseApiErrorResponse(response);
        }
        const payload = (await response.json()) as AnalysisResponse;
        if (payload.agentSteps?.length) setSteps(payload.agentSteps);
        finish(payload);
      } catch (err) {
        const info =
          err instanceof Error || !(err && typeof err === 'object' && 'message' in err)
            ? apiErrorFromUnknown(err, autoRetried)
            : { ...(err as ApiErrorInfo), autoRetried };
        setError(info);
        setLoading(false);
        setAutoRetrying(false);
      }
      window.clearTimeout(slowTimer);
      return;
    }

    try {
      await analyzeWithStream(request, {
        onStep: (step) => {
          setSteps((prev) => [...prev.filter((s) => s.id !== step.id), step]);
        },
        onComplete: finish,
        onAutoRetry,
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
