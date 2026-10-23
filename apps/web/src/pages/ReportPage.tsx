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
import { StorefrontSizeControl } from '../components/report/StorefrontSizeControl';
import { CoTenancyMixSection } from '../components/report/CoTenancyMixSection';
import { ProductExplainer } from '../components/report/ProductExplainer';
import { ReportFirstRunTour } from '../components/report/ReportFirstRunTour';
import { ReportLoadingPanel } from '../components/report/ReportLoadingPanel';
import { ReportMapSkeleton } from '../components/report/ReportMapSkeleton';
import { ShareHead } from '../components/seo/ShareHead';
import { reportShareHead } from '../lib/share-preview';

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

  const shareHead = useMemo(() => {
    if (!results || !request) return null;
    const canonicalPath = `/r/${slug ?? 'run'}?${searchParams.toString()}`;
    return reportShareHead(results, request.radius, canonicalPath, searchParams.toString());
  }, [results, request, slug, searchParams]);

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
    <div className="report-content-enter space-y-6">
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <div className="print-pitch-block space-y-4">
          <ProductExplainer className="no-print rounded-card border border-border bg-surface-2/80 px-4 py-3" />
          <ReportFirstRunTour ready={results.prospects.length > 0} />
          <div className="no-print flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
            <QlooRankingToggle
              mode={rankingMode}
              onChange={setRankingMode}
              compact
              className="shrink-0"
            />
            {results.backtestBaseline && (
              <div className="min-w-0 flex-1">
                <QlooProofBanner results={results} compact />
              </div>
            )}
          </div>
          <HeadlineCard
            results={results}
            radiusKm={request.radius}
            chipSlug={slug}
            backtestOverride={activeBacktest ?? undefined}
          />
        </div>
      </ErrorBoundary>
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
          {(loading || steps.length > 0) && (
            <AgentRunStrip
              steps={steps}
              loading={loading}
              elapsedMs={elapsedMs}
              demoMode={results?.mode === 'demo'}
              recordedAt={results?.timestamp}
            />
          )}
          <div className="no-print mt-4 print-pitch-block">
            <StorefrontSizeControl
              sqFt={request.storefrontSqFt ?? 2500}
              onChange={(sqFt) => {
                ranKey.current = '';
                navigate(buildReportPath({ ...request, storefrontSqFt: sqFt }, slug ?? 'run'), {
                  replace: true,
                });
              }}
            />
          </div>
        </div>
      </ErrorBoundary>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <div className="no-print print-pitch-block">
          <VacancyCostCalculator initial={vacancyInput} onChange={setVacancyInput} />
        </div>
      </ErrorBoundary>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <CoTenancyMixSection results={results} radiusKm={request.radius} />
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
    </div>
  );

  return (
    <div className="min-h-screen bg-bg print-pack">
      {shareHead && <ShareHead {...shareHead} />}
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

      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-6 md:py-8">
        <div className="grid grid-cols-12 gap-6 xl:gap-8">
          <div
            className={`col-span-12 min-w-0 space-y-6 xl:col-span-7 ${
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
              <ReportLoadingPanel
                steps={steps}
                loading={loading}
                geocodeChecking={geocodeChecking}
                elapsedMs={elapsedMs}
              />
            )}
          </div>
          <div
            className={`col-span-12 xl:col-span-5 ${
              mobilePane === 'report' ? 'hidden md:block' : ''
            }`}
          >
            {!results && (loading || geocodeChecking) && !geocodeCandidates && (
              <ReportMapSkeleton />
            )}
            {results && (
              <ErrorBoundary fallback={<SectionUnavailable label="Map unavailable right now." />}>
                <div className="flex flex-col gap-4 md:sticky md:top-[7.5rem]">
                  <ReportMap
                    results={results}
                    selectedBrand={mapBrand}
                    pitchBrandIds={results.prospects.map((p) => p.brand.entityId)}
                    radiusKm={request.radius}
                    captureRef={mapCaptureRef}
                    className="h-[min(72vh,640px)] min-h-[360px] w-full xl:h-[min(78vh,720px)]"
                  />
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
                </div>
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
