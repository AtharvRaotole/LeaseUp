import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { ProspectPack } from '@leaseup/contracts';
import { TopBar } from '../components/layout/TopBar';
import { useAnalysisRun } from '../hooks/useAnalysisRun';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ensureMapLibreCss } from '../lib/maplibre-css';
import { buildReportPath, parseReportSearch } from '../lib/report-params';
import { DEMO_CHIP_ADDRESSES, matchDemoFixtureId } from '../lib/demo-chip-addresses';
import { fetchGeocodePreview } from '../lib/geocode-preview';
import { useHealth } from '../hooks/useHealth';
const GeocodeConfirmPanel = lazy(() =>
  import('../components/report/GeocodeConfirmPanel').then((m) => ({ default: m.GeocodeConfirmPanel }))
);
import type { GeocodeCandidate, Location } from '@leaseup/contracts';
import { AgentRunStrip } from '../components/report/AgentRunStrip';
const ReportDeepSections = lazy(() =>
  import('../components/report/ReportDeepSections').then((m) => ({ default: m.ReportDeepSections }))
);
import { ErrorBoundary } from '../components/ErrorBoundary';
const ReportMap = lazy(() =>
  import('../components/report/ReportMap').then((m) => ({ default: m.ReportMap }))
);
import type { MapBrandSelection, ReportMapCaptureRef } from '../components/report/ReportMap';
const OutreachSheet = lazy(() =>
  import('../components/report/OutreachSheet').then((m) => ({ default: m.OutreachSheet }))
);
import { DemoBanner } from '../components/report/DemoBanner';
import { TasteUnavailableBanner } from '../components/report/TasteUnavailableBanner';
const ReportStickyHeader = lazy(() =>
  import('../components/report/ReportStickyHeader').then((m) => ({ default: m.ReportStickyHeader }))
);
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ReportErrorBanner } from '../components/report/ReportErrorBanner';
import { apiErrorFromUnknown, type ApiErrorInfo } from '../lib/api-error';
import { SERVER_BUSY_MESSAGE } from '../lib/calm-error-copy';
import { SLOW_LOAD_STATUS } from '../lib/slow-load-copy';
import { ReportShortListNotice } from '../components/report/ReportShortListNotice';
const SharePitchDialog = lazy(() =>
  import('../components/report/SharePitchDialog').then((m) => ({ default: m.SharePitchDialog }))
);
import { BrandLoading } from '../components/brand/BrandLoading';
import type { VacancyCalculatorDraft } from '../lib/vacancy-cost';
import { EMPTY_VACANCY_DRAFT } from '../lib/vacancy-cost';
import { loadVacancyDraft, saveVacancyDraft } from '../lib/vacancy-cost-storage';
import { startProspectingJob } from '../lib/start-prospecting';
import { ReportSummaryAboveFold } from '../components/report/ReportSummaryAboveFold';
const WatchSpaceButton = lazy(() =>
  import('../components/report/WatchSpaceButton').then((m) => ({ default: m.WatchSpaceButton }))
);
import { ShareHead } from '../components/seo/ShareHead';
import { reportShareHead } from '../lib/share-preview';
import { ReportLoadingPanel } from '../components/report/ReportLoadingPanel';
import { ReportMapSkeleton } from '../components/report/ReportMapSkeleton';
const ReportSidebarFacts = lazy(() =>
  import('../components/report/ReportSidebarFacts').then((m) => ({ default: m.ReportSidebarFacts }))
);
const WhoShopsHereCard = lazy(() =>
  import('../components/report/WhoShopsHereCard').then((m) => ({ default: m.WhoShopsHereCard }))
);
import { WhyThisBrandCard } from '../components/report/WhyThisBrandCard';
import { AddToPipelineButton } from '../components/pipeline/AddToPipelineButton';
import { pipelineCardFromProspect } from '../lib/build-pipeline-card';
import { activeBacktestForRankingMode } from '../lib/ranking-production';
import { orderProspectsForRankingMode } from '../lib/ranking-mode';
import { absenceRadiusKm as pitchAbsenceRadiusKm } from '../lib/absence-radius';

import { ReportFirstRunTourProvider } from '../components/report/ReportFirstRunTour';

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
  const isMdUp = useMediaQuery('(min-width: 768px)');
  const mountMapColumn = isMdUp || mobilePane === 'map';
  const [deferPostPaint, setDeferPostPaint] = useState(false);
  const [deferMobileBrandDetails, setDeferMobileBrandDetails] = useState(false);
  const [deferDeepSections, setDeferDeepSections] = useState(false);

  useEffect(() => {
    if (mountMapColumn) ensureMapLibreCss();
  }, [mountMapColumn]);

  const expandDeepSections = searchParams.get('screenshot') === '1';

  useEffect(() => {
    if (!results) {
      setDeferPostPaint(false);
      setDeferMobileBrandDetails(false);
      setDeferDeepSections(false);
      return;
    }
    if (expandDeepSections) {
      setDeferPostPaint(true);
      setDeferDeepSections(true);
      if (isMdUp) {
        setDeferMobileBrandDetails(true);
      }
      return;
    }
    let cancelled = false;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const schedule = (cb: () => void, timeoutMs: number) => {
      if (cancelled) return () => undefined;
      if (win.requestIdleCallback) {
        const id = win.requestIdleCallback(() => {
          if (!cancelled) cb();
        }, { timeout: timeoutMs });
        return () => win.cancelIdleCallback?.(id);
      }
      const t = window.setTimeout(() => {
        if (!cancelled) cb();
      }, Math.min(timeoutMs, 1200));
      return () => window.clearTimeout(t);
    };
    let clearTour: (() => void) | undefined;
    let clearBrand: (() => void) | undefined;
    let clearDeep: (() => void) | undefined;
    if (isMdUp) {
      setDeferMobileBrandDetails(true);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!isMdUp) {
          clearBrand = schedule(() => setDeferMobileBrandDetails(true), 400);
        }
        clearTour = schedule(() => setDeferPostPaint(true), 2500);
        if (!expandDeepSections) {
          clearDeep = schedule(() => setDeferDeepSections(true), 12_000);
        }
      });
    });
    return () => {
      cancelled = true;
      clearBrand?.();
      clearTour?.();
      clearDeep?.();
    };
  }, [results, isMdUp, expandDeepSections]);

  const [geocodeCandidates, setGeocodeCandidates] = useState<GeocodeCandidate[] | null>(null);
  const [geocodeChecking, setGeocodeChecking] = useState(false);
  const [geocodeAutoRetrying, setGeocodeAutoRetrying] = useState(false);
  const needsHealthForGeocode =
    request != null &&
    !request.confirmedLocation &&
    !matchDemoFixtureId(request.address) &&
    !simulateError;
  const { data: health } = useHealth({ enabled: needsHealthForGeocode });
  const [rankingMode, setRankingMode] = useState<'qloo' | 'baseline'>('qloo');
  const [sharePitchOpen, setSharePitchOpen] = useState(false);
  const [vacancyEdits, setVacancyEdits] = useState<VacancyCalculatorDraft | null>(null);
  const vacancyBase = useMemo(
    () => (request?.address ? loadVacancyDraft(request.address) : EMPTY_VACANCY_DRAFT),
    [request?.address]
  );
  const vacancyInput = vacancyEdits ?? vacancyBase;
  const mapCaptureRef = useRef<ReportMapCaptureRef | null>(null);
  const ranKey = useRef('');

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

    if (needsHealthForGeocode && !health) {
      return;
    }

    let cancelled = false;

    const runLiveGeocode = () => {
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
    };

    if (health?.mode === 'demo') {
      void import('../lib/demo-geocode-preview').then(({ demoGeocodePreviewForAddress }) => {
        if (cancelled) return;
        const demoPreview = demoGeocodePreviewForAddress(request.address);
        if (demoPreview?.needsConfirmation && demoPreview.candidates.length > 1) {
          setGeocodeCandidates(demoPreview.candidates);
          setGeocodeChecking(false);
          return;
        }
        runLiveGeocode();
      });
    } else {
      runLiveGeocode();
    }

    return () => {
      cancelled = true;
    };
  }, [request, run, simulateError, navigate, health, needsHealthForGeocode]);

  const confirmGeocode = (location: Location) => {
    if (!request) return;
    let address = request.address;
    if (health?.mode === 'demo' && location.resolvedAddress === DEMO_CHIP_ADDRESSES.wicker) {
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

  const pitchProspects = useMemo(
    () => (results ? orderProspectsForRankingMode(results, rankingMode) : []),
    [results, rankingMode]
  );

  if (!request) return null;

  const displayError: ApiErrorInfo | null = simulateError
    ? { message: SERVER_BUSY_MESSAGE, code: 'SERVER_BUSY' }
    : geocodeError ?? error;

  const showErrorBanner =
    Boolean(displayError) || (!simulateError && (autoRetrying || geocodeAutoRetrying));

  const activeBacktest =
    results && activeBacktestForRankingMode(results, rankingMode);

  const reportSections = results && (
    <ReportFirstRunTourProvider ready={deferPostPaint && results.prospects.length > 0}>
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
              pitchProspects={pitchProspects}
              rankingMode={rankingMode}
              selected={selected}
              onSelectBrand={selectProspect}
              onSharePitch={() => setSharePitchOpen(true)}
              showHeadlineStats={deferPostPaint}
              showBrandPitchDetails={isMdUp || deferMobileBrandDetails}
              showPrimaryActions={isMdUp || deferPostPaint}
              vacancyInput={vacancyInput}
              onVacancyChange={handleVacancyChange}
            />
          {deferPostPaint && (
            <Suspense fallback={null}>
              <WatchSpaceButton
                address={request.address}
                radiusKm={request.radius}
                analysis={results}
              />
            </Suspense>
          )}
          {results.prospects.length <= 2 && (
            <ReportShortListNotice
              count={results.prospects.length}
              radiusKm={request.radius}
              results={results}
              request={request}
              slug={slug ?? 'run'}
            />
          )}
          {deferPostPaint && (loading || steps.length > 0) && (
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

      {deferDeepSections && (
        <Suspense fallback={null}>
          <ReportDeepSections
            results={results}
            request={request}
            slug={slug ?? 'run'}
            expandDeepSections={expandDeepSections}
            selected={selected}
            onSelectProspect={selectProspect}
            onDraftOutreach={setOutreach}
            emptyPitch={emptyPitch}
            vacancyInput={vacancyInput}
            onVacancyChange={handleVacancyChange}
            onStorefrontSqFtChange={(sqFt) => {
              ranKey.current = '';
              navigate(buildReportPath({ ...request, storefrontSqFt: sqFt }, slug ?? 'run'), {
                replace: true,
              });
            }}
            rankingMode={rankingMode}
            onRankingModeChange={setRankingMode}
            onMapBrandSelect={selectMapBrand}
          />
        </Suspense>
      )}
      </div>
    </ReportFirstRunTourProvider>
  );

  return (
    <div className="min-h-screen bg-bg print-pack">
      {shareHead && <ShareHead {...shareHead} />}
      <TopBar />
      {results?.mode === 'demo' && deferPostPaint && <DemoBanner />}
      {results?.tasteDataStatus === 'unavailable' && results.rankingNotice && (
        <TasteUnavailableBanner message={results.rankingNotice} />
      )}
      {results ? (
        deferPostPaint ? (
          <Suspense
            fallback={
              <div className="sticky top-16 z-20 border-b border-border bg-surface/90 px-4 py-3">
                <p className="mx-auto max-w-content truncate text-sm text-ink-2">{request.address}</p>
              </div>
            }
          >
            <ReportStickyHeader
              request={request}
              location={results.location}
              chipSlug={slug}
              absenceRadiusKm={pitchAbsenceRadiusKm(results, request.radius)}
              onRadiusChange={() => {
                ranKey.current = '';
              }}
              onSharePitch={() => setSharePitchOpen(true)}
              onRunProspecting={() => {
                void startProspectingJob(request).then((jobId) => navigate(`/prospect/${jobId}`));
              }}
            />
          </Suspense>
        ) : (
          <div className="sticky top-16 z-20 border-b border-border bg-surface/90 px-4 py-3">
            <p className="mx-auto max-w-content truncate text-sm text-ink-2">{request.address}</p>
          </div>
        )
      ) : (
        <div className="sticky top-16 z-20 border-b border-border bg-surface/90 backdrop-blur-md px-4 py-3">
          <p className="mx-auto max-w-content truncate text-sm text-ink-2">{request.address}</p>
        </div>
      )}

      {results && (
        <div className="sticky top-[7.25rem] z-20 border-b border-border bg-bg/95 px-4 py-2 md:hidden">
          <div className="mx-auto max-w-content">
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

      <main id="main-content" className="mx-auto max-w-content px-4 py-6 outline-none md:px-6 md:py-8">
        <div className="grid grid-cols-12 gap-6 xl:gap-8">
          <div
            className={`col-span-12 min-w-0 space-y-6 xl:col-span-7 ${
              mobilePane === 'map' ? 'hidden md:block' : ''
            }`}
          >
            {slowHint && loading && (
              <p className="text-sm text-ink-2" data-testid="report-slow-hint" role="status">
                {SLOW_LOAD_STATUS}
              </p>
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
                  onNoneOfThese={() => navigate(`/?address=${encodeURIComponent(request.address)}`)}
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
            data-testid="report-map-panel"
          >
            {!results && (loading || geocodeChecking) && !geocodeCandidates && (
              <ReportMapSkeleton />
            )}
            {results && mountMapColumn && (
              <ErrorBoundary fallback={<SectionUnavailable label="Map unavailable right now." />}>
                <div className="flex flex-col gap-4 md:sticky md:top-[7.5rem]">
                  <Suspense fallback={<ReportMapSkeleton />}>
                    <ReportMap
                      results={results}
                      selectedBrand={mapBrand}
                      pitchBrandIds={results.prospects.map((p) => p.brand.entityId)}
                      radiusKm={request.radius}
                      captureRef={mapCaptureRef}
                      className="h-[min(56vh,520px)] min-h-[280px] w-full md:h-[min(72vh,640px)] md:min-h-[360px] xl:h-[min(78vh,720px)]"
                    />
                  </Suspense>
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
                  <Suspense fallback={null}>
                    <ReportSidebarFacts
                      results={results}
                      radiusKm={request.radius}
                      chipSlug={slug}
                    />
                  </Suspense>
                  {results.tradeAreaShoppers && (
                    <Suspense fallback={null}>
                      <WhoShopsHereCard snapshot={results.tradeAreaShoppers} />
                    </Suspense>
                  )}
                </div>
              </ErrorBoundary>
            )}
          </div>
        </div>
      </main>
      {results && sharePitchOpen && (
        <Suspense fallback={null}>
          <SharePitchDialog
            open={sharePitchOpen}
            onOpenChange={setSharePitchOpen}
            results={results}
            request={request}
            mapCaptureRef={mapCaptureRef}
            vacancy={vacancyInput}
          />
        </Suspense>
      )}
      {results && outreach && (
        <Suspense fallback={null}>
          <OutreachSheet
            open
            onOpenChange={(o) => !o && setOutreach(null)}
            prospect={outreach}
            results={results}
          />
        </Suspense>
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
