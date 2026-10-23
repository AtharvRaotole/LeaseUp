import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { ProspectPack } from '@leaseup/contracts';
import { TopBar } from '../components/layout/TopBar';
import { useAnalysisRun } from '../hooks/useAnalysisRun';
import { buildReportPath, parseReportSearch } from '../lib/report-params';
import { matchDemoFixtureId } from '@leaseup/fixtures';
import { fetchGeocodePreview } from '../lib/geocode-preview';
const GeocodeConfirmPanel = lazy(() =>
  import('../components/report/GeocodeConfirmPanel').then((m) => ({ default: m.GeocodeConfirmPanel }))
);
import type { GeocodeCandidate, Location } from '@leaseup/contracts';
import { AgentRunStrip } from '../components/report/AgentRunStrip';
import { HeadlineCard } from '../components/report/HeadlineCard';
import { BrandsToPitch } from '../components/report/BrandsToPitch';
import { ProofSection } from '../components/report/ProofSection';
import { CompareSection, CompareUnavailable } from '../components/report/CompareSection';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { HowWeKnowSection } from '../components/report/HowWeKnowSection';
import { ReportMap, type MapBrandSelection } from '../components/report/ReportMap';
import { OutreachSheet } from '../components/report/OutreachSheet';
import { DemoBanner } from '../components/report/DemoBanner';
import { ReportStickyHeader } from '../components/report/ReportStickyHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ReportErrorBanner } from '../components/report/ReportErrorBanner';
import type { ApiErrorInfo } from '../lib/api-error';
import { QlooRankingToggle, type QlooRankingMode } from '../components/report/QlooRankingToggle';
import { QlooProofBanner } from '../components/report/QlooProofBanner';
import { WhyThisBrandCard } from '../components/report/WhyThisBrandCard';
import { BrandLoading } from '../components/brand/BrandLoading';
import { VacancyCostCalculator } from '../components/report/VacancyCostCalculator';
import { SharePitchDialog } from '../components/report/SharePitchDialog';
import type { ReportMapCaptureRef } from '../components/report/ReportMap';
import type { VacancyCalculatorInput } from '@leaseup/contracts';
import { DEFAULT_VACANCY_INPUT } from '../lib/vacancy-cost';
import { startProspectingJob } from '../lib/start-prospecting';
import { AddToPipelineButton } from '../components/pipeline/AddToPipelineButton';
import { pipelineCardFromProspect } from '../lib/build-pipeline-card';

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
  const [rankingMode, setRankingMode] = useState<QlooRankingMode>('qloo');
  const [sharePitchOpen, setSharePitchOpen] = useState(false);
  const [vacancyInput, setVacancyInput] = useState<VacancyCalculatorInput>(DEFAULT_VACANCY_INPUT);
  const mapCaptureRef = useRef<ReportMapCaptureRef | null>(null);
  const ranKey = useRef('');
  const [geocodeCandidates, setGeocodeCandidates] = useState<GeocodeCandidate[] | null>(null);
  const [geocodeChecking, setGeocodeChecking] = useState(false);

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

    const startAnalysis = () => {
      ranKey.current = key;
      void run(request);
    };

    if (request.confirmedLocation || matchDemoFixtureId(request.address)) {
      startAnalysis();
      return;
    }

    let cancelled = false;
    setGeocodeChecking(true);
    setGeocodeCandidates(null);
    void fetchGeocodePreview(request.address)
      .then((preview) => {
        if (cancelled) return;
        if (preview.needsConfirmation && preview.candidates.length > 1) {
          setGeocodeCandidates(preview.candidates);
          return;
        }
        const withLoc = preview.location
          ? { ...request, confirmedLocation: preview.location }
          : request;
        ranKey.current = JSON.stringify(withLoc);
        void run(withLoc);
      })
      .catch(() => {
        if (!cancelled) startAnalysis();
      })
      .finally(() => {
        if (!cancelled) setGeocodeChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [request, run, simulateError, navigate]);

  const confirmGeocode = (location: Location) => {
    if (!request) return;
    const next = { ...request, confirmedLocation: location };
    setGeocodeCandidates(null);
    navigate(buildReportPath(next, slug ?? 'run'), { replace: true });
  };

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

  const activeBacktest =
    results &&
    (rankingMode === 'baseline' && results.backtestBaseline
      ? results.backtestBaseline
      : results.backtest);

  const reportSections = results && (
    <>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <div className="print-pitch-block space-y-4">
          <QlooRankingToggle mode={rankingMode} onChange={setRankingMode} className="no-print" />
          {results.backtestBaseline && (
            <QlooProofBanner results={results} />
          )}
          <HeadlineCard
            results={results}
            radiusKm={request.radius}
            chipSlug={slug}
            backtestOverride={activeBacktest ?? undefined}
          />
        </div>
      </ErrorBoundary>
      {(loading || steps.length > 0) && (
        <AgentRunStrip
          steps={steps}
          loading={loading}
          elapsedMs={elapsedMs}
          demoMode={results?.mode === 'demo'}
          recordedAt={results?.timestamp}
        />
      )}
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <div className="print-pitch-block">
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
          <WhyThisBrandCard
            className="md:hidden"
            prospect={selected}
            results={results}
            radiusKm={request.radius}
            actions={
              selected ? (
                <AddToPipelineButton
                  buildPayload={() =>
                    pipelineCardFromProspect(selected, results, {
                      reportPath: buildReportPath(request, slug ?? 'run'),
                    })
                  }
                />
              ) : null
            }
          />
        </div>
      </ErrorBoundary>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <div className="no-print print-pitch-block">
          <VacancyCostCalculator initial={vacancyInput} onChange={setVacancyInput} />
        </div>
      </ErrorBoundary>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <div className="no-print">
          <ProofSection
            results={results}
            radiusKm={request.radius}
            onBrandSelect={selectMapBrand}
            rankingMode={rankingMode}
          />
        </div>
      </ErrorBoundary>
      <ErrorBoundary fallback={<CompareUnavailable />}>
        <div className="no-print">
          <CompareSection />
        </div>
      </ErrorBoundary>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <div className="no-print">
          <HowWeKnowSection results={results} />
        </div>
      </ErrorBoundary>
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
          onSharePitch={() => setSharePitchOpen(true)}
          onRunProspecting={() => {
            void startProspectingJob(request).then((jobId) => navigate(`/prospect/${jobId}`));
          }}
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
            {geocodeCandidates && (
              <Suspense fallback={<BrandLoading label="Loading map to confirm address…" />}>
                <GeocodeConfirmPanel
                  address={request.address}
                  candidates={geocodeCandidates}
                  onConfirm={confirmGeocode}
                  onCancel={() => navigate('/')}
                />
              </Suspense>
            )}
            {reportSections}
            {!results && (loading || geocodeChecking) && !simulateError && !geocodeCandidates && (
              <BrandLoading
                label={
                  geocodeChecking
                    ? 'Checking address on the map…'
                    : `Running analysis for ${slug ?? 'report'}…`
                }
              />
            )}
          </div>
          <div
            className={`col-span-12 xl:col-span-5 ${
              mobilePane === 'report' ? 'hidden md:block' : ''
            }`}
          >
            {results && (
              <ErrorBoundary fallback={<SectionUnavailable label="Map unavailable right now." />}>
                <WhyThisBrandCard
                  className="hidden md:block"
                  prospect={selected}
                  results={results}
                  radiusKm={request.radius}
                  actions={
                    selected ? (
                      <AddToPipelineButton
                        buildPayload={() =>
                          pipelineCardFromProspect(selected, results, {
                            reportPath: buildReportPath(request, slug ?? 'run'),
                          })
                        }
                      />
                    ) : null
                  }
                />
                <ReportMap
                  results={results}
                  selectedBrand={mapBrand}
                  pitchBrandIds={results.prospects.map((p) => p.brand.entityId)}
                  radiusKm={request.radius}
                  captureRef={mapCaptureRef}
                  className="h-[max(400px,calc(100vh-11rem))] w-full md:sticky md:top-[7.5rem] md:h-[max(520px,calc(100vh-8rem))]"
                />
              </ErrorBoundary>
            )}
          </div>
        </div>
      </div>
      {results && (
        <SharePitchDialog
          open={sharePitchOpen}
          onOpenChange={setSharePitchOpen}
          results={results}
          request={request}
          mapCaptureRef={mapCaptureRef}
          vacancy={vacancyInput}
        />
      )}
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

function SectionUnavailable({ label = 'This section is unavailable right now.' }: { label?: string }) {
  return (
    <p className="rounded-card border border-border bg-surface p-4 text-sm text-ink-2">{label}</p>
  );
}
