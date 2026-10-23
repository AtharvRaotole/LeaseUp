import { useCallback, useRef, useState } from 'react';
import type { AnalysisRequest, AnalysisResponse, AnalysisStep } from '@leaseup/contracts';
import { analyzeWithStream } from '../lib/analyzeStream';
import { apiUrl } from '../lib/api';

export function useAnalysisRun() {
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const startedRef = useRef<number>(0);

  const run = useCallback(async (request: AnalysisRequest) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSteps([]);
    setElapsedMs(null);
    setSlowHint(false);
    startedRef.current = performance.now();

    const slowTimer = window.setTimeout(() => setSlowHint(true), 6000);

    let completed = false;

    const finish = (payload: AnalysisResponse) => {
      completed = true;
      setResults(payload);
      setElapsedMs(Math.round(performance.now() - startedRef.current));
      setLoading(false);
      window.clearTimeout(slowTimer);
    };

    try {
      await analyzeWithStream(request, {
        onStep: (step) => {
          setSteps((prev) => [...prev.filter((s) => s.id !== step.id), step]);
        },
        onComplete: finish,
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
        onError: (message) => setError(message),
      });
    } catch {
      /* stream race */
    }

    if (!completed) {
      try {
        const response = await fetch(apiUrl('/api/analyze'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Analysis failed');
        }
        finish((await response.json()) as AnalysisResponse);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    }
    window.clearTimeout(slowTimer);
  }, []);

  return { steps, results, error, loading, elapsedMs, slowHint, run };
}
