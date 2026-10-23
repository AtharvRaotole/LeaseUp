import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisRequest, AnalysisResponse, AnalysisStep, ProspectPack } from '@leaseup/contracts';
import { Header } from './components/Header';
import { HeroSearch } from './components/HeroSearch';
import { AgentTimeline } from './components/AgentTimeline';
import { BacktestReveal } from './components/BacktestReveal';
import { TasteMap } from './components/TasteMap';
import { CompareFlip } from './components/CompareFlip';
import { ProspectPacks } from './components/ProspectPacks';
import { HowWeKnowDrawer } from './components/HowWeKnowDrawer';
import { analyzeWithStream } from './lib/analyzeStream';
import { apiUrl } from './lib/api';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<ProspectPack | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const startedDemo = useRef(false);

  const runAnalysis = useCallback(async (request: AnalysisRequest) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setSteps([]);
    setSelectedProspect(null);
    const started = performance.now();

    let completed = false;

    const streamPromise = analyzeWithStream(request, {
      onStep: (step) => {
        setSteps((prev) => {
          const next = prev.filter((s) => s.id !== step.id);
          return [...next, step];
        });
      },
      onComplete: (payload) => {
        completed = true;
        setResults(payload);
        setElapsedMs(Math.round(performance.now() - started));
        setIsLoading(false);
        if (payload.prospects[0]) setSelectedProspect(payload.prospects[0]);
        const pending = payload.prospects.filter((p) => p.brand.verified === 'verifying...').length;
        if (pending > 0) {
          setSteps((prev) =>
            prev.map((s) =>
              s.id === 'verify'
                ? {
                    ...s,
                    summary: `${pending} queued for OpenStreetMap verification (non-blocking)`,
                  }
                : s
            )
          );
        }
      },
      onVerification: (payload) => {
        setResults((prev) =>
          prev
            ? { ...prev, prospects: payload.prospects }
            : prev
        );
        const summary = payload.osmSummary;
        let verifySummary = 'OpenStreetMap verification complete';
        if (summary?.unavailable) {
          verifySummary = 'OSM unavailable — showing 1-source results';
        } else if (summary) {
          const parts: string[] = [];
          if (summary.verifiedTwoSource > 0) {
            parts.push(`${summary.verifiedTwoSource} verified (ATP + OSM)`);
          }
          if (summary.conflicts > 0) {
            parts.push(`${summary.conflicts} conflict${summary.conflicts === 1 ? '' : 's'} removed`);
          }
          if (summary.singleSource > 0) {
            parts.push(`${summary.singleSource} single-source only`);
          }
          if (parts.length > 0) verifySummary = parts.join(' · ');
        }
        setSteps((prev) =>
          prev.map((s) =>
            s.id === 'verify'
              ? { ...s, status: 'complete' as const, summary: verifySummary }
              : s
          )
        );
      },
      onError: () => undefined,
    });

    await Promise.race([
      streamPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('stream-timeout')), 4000)),
    ]).catch(() => undefined);

    if (completed) return;

    try {
      const response = await fetch(apiUrl('/api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Analysis failed');
      }
      const payload = (await response.json()) as AnalysisResponse;
      setResults(payload);
      setElapsedMs(Math.round(performance.now() - started));
      if (payload.prospects[0]) setSelectedProspect(payload.prospects[0]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    if (!demo || startedDemo.current) return;
    startedDemo.current = true;
    const address =
      demo === 'wicker' || demo === 'boulder' || demo === 'sevierville'
        ? DEMO_CHIP_ADDRESSES[demo]
        : undefined;
    if (address) void runAnalysis({ address, radius: 10 });
  }, [runAnalysis]);

  return (
    <div className="min-h-screen bg-surface text-zinc-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <HeroSearch onSubmit={runAnalysis} isLoading={isLoading} />

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        {(isLoading || steps.length > 0) && (
          <section className="no-print">
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Agent timeline</h2>
            <AgentTimeline steps={steps} />
          </section>
        )}

        {results && (
          <div className="space-y-10">
            {elapsedMs !== null && (
              <p className="text-xs text-zinc-500">Completed in {elapsedMs}ms</p>
            )}
            <div className="no-print">
              <BacktestReveal results={results} />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <TasteMap
                results={results}
                selectedProspect={selectedProspect}
                onSelectProspect={setSelectedProspect}
              />
              <CompareFlip />
            </div>
            <ProspectPacks
              results={results}
              selectedId={selectedProspect?.brand.entityId ?? null}
              onSelect={setSelectedProspect}
            />
          </div>
        )}
      </main>
      <HowWeKnowDrawer results={results} />
    </div>
  );
}

export default App;
