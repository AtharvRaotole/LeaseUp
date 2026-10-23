import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { ProspectPack } from '@leaseup/contracts';
import { TopBar } from '../components/layout/TopBar';
import { useAnalysisRun } from '../hooks/useAnalysisRun';
import { buildReportPath, parseReportSearch } from '../lib/report-params';
import { DEMO_CHIP_ADDRESSES, matchDemoFixtureId } from '@leaseup/fixtures';
import { fetchGeocodePreview } from '../lib/geocode-preview';
import { demoGeocodePreviewForAddress } from '../lib/demo-geocode-preview';
import { useHealth } from '../hooks/useHealth';
const GeocodeConfirmPanel = lazy(() =>
  import('../components/report/GeocodeConfirmPanel').then((m) => ({ default: m.GeocodeConfirmPanel }))
);
import type { GeocodeCandidate, Location } from '@leaseup/contracts';
import { AgentRunStrip } from '../components/report/AgentRunStrip';
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
import { apiErrorFromUnknown, type ApiErrorInfo } from '../lib/api-error';
import { SERVER_BUSY_MESSAGE } from '../lib/calm-error-copy';
import { QlooRankingToggle, type QlooRankingMode } from '../components/report/QlooRankingToggle';
import { QlooProofBanner } from '../components/report/QlooProofBanner';
import { StrictEvalCard } from '../components/report/StrictEvalCard';
import { WhyThisBrandCard } from '../components/report/WhyThisBrandCard';
import { BrandLoading } from '../components/brand/BrandLoading';
import { VacancyCostCalculator } from '../components/report/VacancyCostCalculator';
import { SharePitchDialog } from '../components/report/SharePitchDialog';
import type { ReportMapCaptureRef } from '../components/report/ReportMap';
import type { VacancyCalculatorDraft } from '../lib/vacancy-cost';
import { EMPTY_VACANCY_DRAFT } from '../lib/vacancy-cost';
import { loadVacancyDraft, saveVacancyDraft } from '../lib/vacancy-cost-storage';
import { startProspectingJob } from '../lib/start-prospecting';
import { AddToPipelineButton } from '../components/pipeline/AddToPipelineButton';
import { pipelineCardFromProspect } from '../lib/build-pipeline-card';
import { StorefrontSizeControl } from '../components/report/StorefrontSizeControl';
import { CoTenancyMixSection } from '../components/report/CoTenancyMixSection';
import { ReportFirstRunTour } from '../components/report/ReportFirstRunTour';
import { ReportSummaryAboveFold } from '../components/report/ReportSummaryAboveFold';
import { WatchSpaceButton } from '../components/report/WatchSpaceButton';
import { ReportCollapsibleSection } from '../components/report/ReportCollapsibleSection';
import { ProductExplainer } from '../components/report/ProductExplainer';
import { ReportLoadingPanel } from '../components/report/ReportLoadingPanel';
import { ReportMapSkeleton } from '../components/report/ReportMapSkeleton';
import { ReportSidebarFacts } from '../components/report/ReportSidebarFacts';
import { WhoShopsHereCard } from '../components/report/WhoShopsHereCard';
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
  const { steps, results, error, autoRetrying, loading, elapsedMs, slowHint, run, retry } =
    useAnalysisRun();
  const [geocodeError, setGeocodeError] = useState<ApiErrorInfo | null>(null);
  const [selected, setSelected] = useState<ProspectPack | null>(null);
  const [mapBrand, setMapBrand] = useState<MapBrandSelection | null>(null);
  const [outreach, setOutreach] = useState<ProspectPack | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>('report');
  const [rankingMode, setRankingMode] = useState<QlooRankingMode>('qloo');
  const [sharePitchOpen, setSharePitchOpen] = useState(false);
  const [vacancyEdits, setVacancyEdits] = useState<VacancyCalculatorDraft | null>(null);
  const vacancyBase = useMemo(
    () => (request?.address ? loadVacancyDraft(request.address) : EMPTY_VACANCY_DRAFT),
    [request?.address]
  );
  const vacancyInput = vacancyEdits ?? vacancyBase;
  const mapCaptureRef = useRef<ReportMapCaptureRef | null>(null);
  const ranKey = useRef('');
  const [geocodeCandidates, setGeocodeCandidates] = useState<GeocodeCandidate[] | null>(null);
  const [geocodeChecking, setGeocodeChecking] = useState(false);
  const [geocodeAutoRetrying, setGeocodeAutoRetrying] = useState(false);
  const { data: health } = useHealth();

  useEffect(() => {
    if (searchParams.get('screenshot') === '1') {
      document.documentElement.classList.add('screenshot-capture');
      return () => document.documentElement.classList.remove('screenshot-capture');
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    setVacancyEdits(null);
  }, [request?.address]);

  const handleVacancyChange = (next: VacancyCalculatorDraft) => {
    setVacancyEdits(next);
    if (request?.address) saveVacancyDraft(request.address, next);
  };

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

    const demoPreview =
      health?.mode === 'demo' ? demoGeocodePreviewForAddress(request.address) : null;
    if (demoPreview?.needsConfirmation && demoPreview.candidates.length > 1) {
      setGeocodeCandidates(demoPreview.candidates);
      return;
    }

    let cancelled = false;
    setGeocodeChecking(true);
    setGeocodeCandidates(null);
    setGeocodeError(null);
    setGeocodeAutoRetrying(false);
    void fetchGeocodePreview(request.address, {
      onAutoRetry: () => setGeocodeAutoRetrying(true),
    })
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
      .catch((err) => {
        if (!cancelled) setGeocodeError(apiErrorFromUnknown(err));
      })
      .finally(() => {
        if (!cancelled) {
          setGeocodeChecking(false);
          setGeocodeAutoRetrying(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [request, run, simulateError, navigate, health?.mode]);

  const confirmGeocode = (location: Location) => {
    if (!request) return;
    let address = request.address;
    if (
      health?.mode === 'demo' &&
      demoGeocodePreviewForAddress(request.address) &&
      location.resolvedAddress === DEMO_CHIP_ADDRESSES.wicker
    ) {
      address = DEMO_CHIP_ADDRESSES.wicker;
    }
    const next = { ...request, address, confirmedLocation: location };
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
      ? { message: SERVER_BUSY_MESSAGE, code: 'SERVER_BUSY' }
      : geocodeError ?? error;

  const showErrorBanner =
    Boolean(displayError) || (!simulateError && (autoRetrying || geocodeAutoRetrying));

  const activeBacktest =
    results &&
    (rankingMode === 'baseline' && results.backtestBaseline
      ? results.backtestBaseline
      : results.backtest);

  const expandDeepSections = searchParams.get('screenshot') === '1';

  const reportSections = results && (
    <div className="report-content-enter space-y-8 text-body">
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <div className="print-pitch-block space-y-6">
          <ReportSummaryAboveFold
            results={results}
            request={request}
            slug={slug ?? 'run'}
            radiusKm={request.radius}
            chipSlug={slug}
            backtestOverride={activeBacktest ?? undefined}
            selected={selected}
            onSelectBrand={selectProspect}
            onSharePitch={() => setSharePitchOpen(true)}
          />
          <WatchSpaceButton
            address={request.address}
            radiusKm={request.radius}
            analysis={results}
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
        </div>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionUnavailable />}>
        <ReportCollapsibleSection
          testId="report-section-why-brands"
          sectionId="report-why-brands"
          title="Why these brands"
          description="Full pitch list, detail for the selected brand, and who already leases nearby."
          defaultOpen={expandDeepSections}
        >
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
          </div>
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
          <CoTenancyMixSection results={results} radiusKm={request.radius} />
        </ReportCollapsibleSection>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionUnavailable />}>
        <ReportCollapsibleSection
          testId="report-section-vacancy-costs"
          sectionId="report-vacancy-costs"
          title="What it costs you"
          description="Monthly vacancy cost and how big the space is."
          defaultOpen={expandDeepSections}
        >
          <div className="no-print print-pitch-block">
            <VacancyCostCalculator
              key={request.address}
              compact
              initial={vacancyInput}
              onChange={handleVacancyChange}
              showPitchOptIn
            />
          </div>
          <div className="no-print print-pitch-block">
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
        </ReportCollapsibleSection>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionUnavailable />}>
        <ReportCollapsibleSection
          testId="report-section-how-we-know"
          sectionId="report-how-we-know"
          title="How we know"
          description="How we ranked brands, charts, and methodology."
          defaultOpen={expandDeepSections}
        >
          <ProductExplainer className="no-print rounded-card border border-border bg-surface-2/80 px-4 py-4 text-body" />
          <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
          <div className="no-print">
            <StrictEvalCard results={results} />
          </div>
          <div className="no-print">
            <ProofSection
              results={results}
              radiusKm={request.radius}
              onBrandSelect={selectMapBrand}
              rankingMode={rankingMode}
            />
          </div>
          <ErrorBoundary fallback={<CompareUnavailable />}>
            <div className="no-print">
              <CompareSection />
            </div>
          </ErrorBoundary>
          <div className="no-print">
            <HowWeKnowSection results={results} />
          </div>
        </ReportCollapsibleSection>
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
            {showErrorBanner && (
              <ReportErrorBanner
                error={displayError}
                retrying={autoRetrying || geocodeAutoRetrying}
                onRetry={() => {
                  ranKey.current = '';
                  setGeocodeError(null);
                  if (geocodeError && request) {
                    setGeocodeChecking(true);
                    void fetchGeocodePreview(request.address, {
                      onAutoRetry: () => setGeocodeAutoRetrying(true),
                    })
                      .then((preview) => {
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
                      .catch((err) => setGeocodeError(apiErrorFromUnknown(err)))
                      .finally(() => {
                        setGeocodeChecking(false);
                        setGeocodeAutoRetrying(false);
                      });
                    return;
                  }
                  retry();
                }}
              />
            )}
            {geocodeCandidates && (
              <Suspense fallback={<BrandLoading label="Loading map to confirm address…" />}>
                <GeocodeConfirmPanel
                  address={request.address}
                  candidates={geocodeCandidates}
                  onConfirm={confirmGeocode}
                  onCancel={() => navigate('/')}
                  onNoneOfThese={() =>
                    navigate(`/?address=${encodeURIComponent(request.address)}`)
                  }
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
                  <ReportSidebarFacts
                    results={results}
                    radiusKm={request.radius}
                    chipSlug={slug}
                  />
                  {results.tradeAreaShoppers && (
                    <WhoShopsHereCard snapshot={results.tradeAreaShoppers} />
                  )}
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
      {results && (
        <ReportFirstRunTour ready={results.prospects.length > 0} />
      )}
      <footer className="no-print py-8 text-center text-meta text-ink-3">
        <Link to="/" className="text-accent hover:underline">Back to search</Link>
      </footer>
    </div>
  );
}

function SectionUnavailable({ label = 'This section is unavailable right now.' }: { label?: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 text-sm text-ink-2">
      <p>{label}</p>
      <p className="mt-2 text-ink-3">Refresh the page to try again, or continue with the rest of the report.</p>
    </div>
  );
}
