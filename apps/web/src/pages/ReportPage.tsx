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
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ReportErrorBanner } from '../components/report/ReportErrorBanner';
import type { ApiErrorInfo } from '../lib/api-error';

type MobilePane = 'report' | 'map';

export function ReportPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const request = useMemo(() => parseReportSearch(searchParams), [searchParams]);
  const simulateError = searchParams.get('simulateError') === '1';
  const emptyPitch = searchParams.get('emptyPitch') === '1';
  const { steps, results, error, loading, elapsedMs, slowHint, run, retry } = useAnalysisRun();
  const [selected, setSelected] = useState<ProspectPack | null>(null);
  const [mapBrand, setMapBrand] = useState<MapBrandSelection | null>(null);
  const [outreach, setOutreach] = useState<ProspectPack | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>('report');
  const ranKey = useRef('');

  useEffect(() => {
    if (searchParams.get('screenshot') === '1') {
      document.documentElement.classList.add('screenshot-capture');
      return () => document.documentElement.classList.remove('screenshot-capture');
    }
    return undefined;
  }, [searchParams]);

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

  const displayError: ApiErrorInfo | null =
    simulateError
      ? { message: 'We could not load this report. Check your connection and try again.' }
      : error;

  const reportSections = results && (
    <>
      <HeadlineCard results={results} radiusKm={request.radius} chipSlug={slug} />
      <BrandsToPitch
        results={results}
        request={request}
        slug={slug ?? 'run'}
        selectedId={selected?.brand.entityId ?? null}
        onSelect={selectProspect}
        onDraft={(p) => setOutreach(p)}
        radiusKm={request.radius}
        forceEmpty={emptyPitch}
      />
      {(loading || steps.length > 0) && (
        <AgentRunStrip
          steps={steps}
          loading={loading}
          elapsedMs={elapsedMs}
          demoMode={results?.mode === 'demo'}
          recordedAt={results?.timestamp}
        />
      )}
      <ProofSection results={results} radiusKm={request.radius} onBrandSelect={selectMapBrand} />
      <CompareSection />
      <HowWeKnowSection results={results} />
    </>
  );

  return (
    <div className="min-h-screen bg-bg print-pack">
      <TopBar />
      {results?.mode === 'demo' && <DemoBanner />}
      {results && (
        <ReportStickyHeader
          request={request}
          location={results.location}
          chipSlug={slug}
          onRadiusChange={() => { ranKey.current = ''; }}
        />
      )}
      {!results && (
        <div className="sticky top-16 z-20 border-b border-border bg-surface/90 backdrop-blur-md px-4 py-3">
          <p className="mx-auto max-w-[1280px] truncate text-sm text-ink-2">{request.address}</p>
        </div>
      )}

      {results && (
        <div className="sticky top-[7.25rem] z-20 border-b border-border bg-bg/95 px-4 py-2 md:hidden">
          <div className="mx-auto max-w-[1280px]">
            <SegmentedControl
              value={mobilePane}
              onChange={setMobilePane}
              options={[
                { value: 'report', label: 'Report' },
                { value: 'map', label: 'Map' },
              ]}
            />
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="grid grid-cols-12 gap-8">
          <div
            className={`col-span-12 min-w-0 space-y-10 xl:col-span-7 ${
              mobilePane === 'map' ? 'hidden md:block' : ''
            }`}
          >
            {slowHint && loading && (
              <p className="text-sm text-ink-2">Still working. Large cities take a few extra seconds.</p>
            )}
            {displayError && (
              <ReportErrorBanner error={displayError} onRetry={() => { ranKey.current = ''; retry(); }} />
            )}
            {reportSections}
            {!results && loading && !simulateError && (
              <p className="text-ink-2">Running analysis for {slug ?? 'report'}...</p>
            )}
          </div>
          <div
            className={`col-span-12 xl:col-span-5 ${
              mobilePane === 'report' ? 'hidden md:block' : ''
            }`}
          >
            {results && (
              <ReportMap
                results={results}
                selectedBrand={mapBrand}
                pitchBrandIds={results.prospects.map((p) => p.brand.entityId)}
                radiusKm={request.radius}
                className="h-[max(400px,calc(100vh-11rem))] w-full md:sticky md:top-[7.5rem] md:h-[max(520px,calc(100vh-8rem))]"
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
