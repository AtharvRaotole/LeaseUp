import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { ProspectPack } from '@leaseup/contracts';
import { TopBar } from '../components/layout/TopBar';
import { useAnalysisRun } from '../hooks/useAnalysisRun';
import { parseReportSearch } from '../lib/report-params';
import { AgentRunStrip } from '../components/report/AgentRunStrip';
import { HeadlineCard } from '../components/report/HeadlineCard';
import { BrandsToPitch } from '../components/report/BrandsToPitch';
import { ProofSection } from '../components/report/ProofSection';
import { CompareSection } from '../components/report/CompareSection';
import { HowWeKnowSection } from '../components/report/HowWeKnowSection';
import { ReportMap } from '../components/report/ReportMap';
import { OutreachSheet } from '../components/report/OutreachSheet';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export function ReportPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const request = useMemo(() => parseReportSearch(searchParams), [searchParams]);
  const { steps, results, error, loading, elapsedMs, slowHint, run } = useAnalysisRun();
  const [selected, setSelected] = useState<ProspectPack | null>(null);
  const [outreach, setOutreach] = useState<ProspectPack | null>(null);
  const ranKey = useRef('');

  useEffect(() => {
    if (!request) {
      navigate('/');
      return;
    }
    const key = JSON.stringify(request);
    if (ranKey.current === key) return;
    ranKey.current = key;
    void run(request);
  }, [request, run, navigate]);

  useEffect(() => {
    if (results?.prospects[0] && !selected) setSelected(results.prospects[0]);
  }, [results, selected]);

  const share = () => {
    void navigator.clipboard.writeText(window.location.href);
  };

  if (!request) return null;

  return (
    <div className="min-h-screen bg-bg print-pack">
      <TopBar />
      {results?.mode === 'demo' && (
        <div className="border-b border-border bg-[#FEF3C7] px-4 py-2 text-center text-sm text-warn dark:bg-[#422006]">
          Demo mode uses recorded Qloo and store data for three example addresses.
        </div>
      )}
      <div className="sticky top-16 z-20 border-b border-border bg-bg/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{request.address}</p>
          <Badge tone="neutral">{request.radius} km</Badge>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>New search</Button>
          <Button variant="secondary" size="sm" onClick={share}>Share</Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>Export PDF</Button>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,640px)_minmax(320px,1fr)]">
          <div className="space-y-10 min-w-0">
            {(loading || steps.length > 0) && (
              <AgentRunStrip steps={steps} loading={loading} elapsedMs={elapsedMs} />
            )}
            {slowHint && loading && (
              <p className="text-sm text-ink-2">Still working. Large cities take a few extra seconds.</p>
            )}
            {error && (
              <div className="rounded-card border border-danger/30 bg-surface px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
            {results && (
              <>
                <HeadlineCard results={results} radiusKm={request.radius} />
                <BrandsToPitch
                  results={results}
                  selectedId={selected?.brand.entityId ?? null}
                  onSelect={setSelected}
                  onDraft={(p) => setOutreach(p)}
                  radiusKm={request.radius}
                />
                <ProofSection results={results} />
                <CompareSection />
                <HowWeKnowSection results={results} />
              </>
            )}
            {!results && loading && (
              <p className="text-ink-2">Running analysis for {slug ?? 'report'}...</p>
            )}
          </div>
          <div className="xl:sticky xl:top-24 xl:h-[calc(100vh-96px)]">
            {results && (
              <ReportMap results={results} selectedProspect={selected} radiusKm={request.radius} />
            )}
          </div>
        </div>
      </div>
      {results && (
        <OutreachSheet
          open={!!outreach}
          onOpenChange={(o) => !o && setOutreach(null)}
          prospect={outreach}
          results={results}
        />
      )}
      <footer className="no-print py-8 text-center text-meta text-ink-3">
        <Link to="/" className="text-accent hover:underline">Back to search</Link>
      </footer>
    </div>
  );
}
