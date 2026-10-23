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
import { ReportMap, type MapBrandSelection } from '../components/report/ReportMap';
import { OutreachSheet } from '../components/report/OutreachSheet';
import { DemoBanner } from '../components/report/DemoBanner';
import { ReportStickyHeader } from '../components/report/ReportStickyHeader';

export function ReportPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const request = useMemo(() => parseReportSearch(searchParams), [searchParams]);
  const simulateError = searchParams.get('simulateError') === '1';
  const { steps, results, error, loading, elapsedMs, slowHint, run } = useAnalysisRun();
  const [selected, setSelected] = useState<ProspectPack | null>(null);
  const [mapBrand, setMapBrand] = useState<MapBrandSelection | null>(null);
  const [outreach, setOutreach] = useState<ProspectPack | null>(null);
  const ranKey = useRef('');

  useEffect(() => {
    if (!request) {
      navigate('/');
      return;
    }
    if (simulateError) return;
    const key = JSON.stringify(request);
    if (ranKey.current === key) return;
    ranKey.current = key;
    void run(request);
  }, [request, run, simulateError, navigate]);

  useEffect(() => {
    if (results?.prospects[0] && !selected) {
      setSelected(results.prospects[0]);
      setMapBrand({
        entityId: results.prospects[0].brand.entityId,
        name: results.prospects[0].brand.name,
      });
    }
  }, [results, selected]);

  const selectProspect = (p: ProspectPack) => {
    setSelected(p);
    setMapBrand({ entityId: p.brand.entityId, name: p.brand.name });
  };

  const selectMapBrand = (entityId: string, name: string) => {
    setMapBrand({ entityId, name });
  };

  if (!request) return null;

  const displayError =
    simulateError
      ? 'We could not load this report. Check your connection and try again.'
      : error;

  return (
    <div className="min-h-screen bg-bg print-pack">
      <TopBar />
      {results?.mode === 'demo' && <DemoBanner />}
      {results && (
        <ReportStickyHeader request={request} location={results.location} onRadiusChange={() => { ranKey.current = ''; }} />
      )}
      {!results && (
        <div className="sticky top-16 z-20 border-b border-border bg-surface/90 backdrop-blur-md px-4 py-3">
          <p className="mx-auto max-w-[1280px] truncate text-sm text-ink-2">{request.address}</p>
        </div>
      )}

      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 min-w-0 space-y-10 xl:col-span-7">
            {(loading || steps.length > 0) && (
              <AgentRunStrip
                steps={steps}
                loading={loading}
                elapsedMs={elapsedMs}
                demoMode={results?.mode === 'demo'}
                recordedAt={results?.timestamp}
              />
            )}
            {slowHint && loading && (
              <p className="text-sm text-ink-2">Still working. Large cities take a few extra seconds.</p>
            )}
            {displayError && (
              <div
                className="rounded-card border border-danger/30 bg-surface px-4 py-3 text-sm text-danger"
                data-testid="report-error"
              >
                {displayError}
              </div>
            )}
            {results && (
              <>
                <HeadlineCard results={results} radiusKm={request.radius} />
                <BrandsToPitch
                  results={results}
                  request={request}
                  slug={slug ?? 'run'}
                  selectedId={selected?.brand.entityId ?? null}
                  onSelect={selectProspect}
                  onDraft={(p) => setOutreach(p)}
                  radiusKm={request.radius}
                />
                <ProofSection results={results} radiusKm={request.radius} onBrandSelect={selectMapBrand} />
                <CompareSection />
                <HowWeKnowSection results={results} />
              </>
            )}
            {!results && loading && !simulateError && (
              <p className="text-ink-2">Running analysis for {slug ?? 'report'}...</p>
            )}
          </div>
          <div className="col-span-12 xl:col-span-5">
            {results && (
              <ReportMap
                results={results}
                selectedBrand={mapBrand}
                radiusKm={request.radius}
                className="xl:sticky xl:top-[7.5rem] h-[max(520px,calc(100vh-8rem))] w-full"
              />
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
