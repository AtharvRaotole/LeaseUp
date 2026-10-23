import { lazy, Suspense } from 'react';
import type { AnalysisRequest, AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { ErrorBoundary } from '../ErrorBoundary';
import { ReportCollapsibleSection } from './ReportCollapsibleSection';
import { WhyThisBrandCard } from './WhyThisBrandCard';
import { AddToPipelineButton } from '../pipeline/AddToPipelineButton';
import { pipelineCardFromProspect } from '../../lib/build-pipeline-card';
import { buildReportPath } from '../../lib/report-params';
import { ProductExplainer } from './ProductExplainer';
import { QlooRankingToggle, type QlooRankingMode } from './QlooRankingToggle';
import { CompareUnavailable } from './CompareSection';
import type { VacancyCalculatorDraft } from '../../lib/vacancy-cost';

const BrandsToPitch = lazy(() =>
  import('./BrandsToPitch').then((m) => ({ default: m.BrandsToPitch }))
);
const CoTenancyMixSection = lazy(() =>
  import('./CoTenancyMixSection').then((m) => ({ default: m.CoTenancyMixSection }))
);
const VacancyCostCalculator = lazy(() =>
  import('./VacancyCostCalculator').then((m) => ({ default: m.VacancyCostCalculator }))
);
const StorefrontSizeControl = lazy(() =>
  import('./StorefrontSizeControl').then((m) => ({ default: m.StorefrontSizeControl }))
);
const QlooProofBanner = lazy(() =>
  import('./QlooProofBanner').then((m) => ({ default: m.QlooProofBanner }))
);
const StrictEvalCard = lazy(() =>
  import('./StrictEvalCard').then((m) => ({ default: m.StrictEvalCard }))
);
const ProofSection = lazy(() =>
  import('./ProofSection').then((m) => ({ default: m.ProofSection }))
);
const CompareSection = lazy(() =>
  import('./CompareSection').then((m) => ({ default: m.CompareSection }))
);
const HowWeKnowSection = lazy(() =>
  import('./HowWeKnowSection').then((m) => ({ default: m.HowWeKnowSection }))
);

export function ReportDeepSections({
  results,
  request,
  slug,
  expandDeepSections,
  selected,
  onSelectProspect,
  onDraftOutreach,
  emptyPitch,
  vacancyInput,
  onVacancyChange,
  onStorefrontSqFtChange,
  rankingMode,
  onRankingModeChange,
  onMapBrandSelect,
}: {
  results: AnalysisResponse;
  request: AnalysisRequest;
  slug: string;
  expandDeepSections: boolean;
  selected: ProspectPack | null;
  onSelectProspect: (p: ProspectPack) => void;
  onDraftOutreach: (p: ProspectPack) => void;
  emptyPitch: boolean;
  vacancyInput: VacancyCalculatorDraft;
  onVacancyChange: (next: VacancyCalculatorDraft) => void;
  onStorefrontSqFtChange: (sqFt: number) => void;
  rankingMode: QlooRankingMode;
  onRankingModeChange: (mode: QlooRankingMode) => void;
  onMapBrandSelect: (entityId: string, name: string) => void;
}) {
  return (
    <>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <ReportCollapsibleSection
          testId="report-section-why-brands"
          sectionId="report-why-brands"
          title="Why these brands"
          description="Full pitch list, detail for the selected brand, and who already leases nearby."
          defaultOpen={expandDeepSections}
        >
          <div className="print-pitch-block">
            <Suspense fallback={null}>
              <BrandsToPitch
                results={results}
                request={request}
                slug={slug}
                selectedId={selected?.brand.entityId ?? null}
                onSelect={onSelectProspect}
                onDraft={onDraftOutreach}
                radiusKm={request.radius}
                forceEmpty={emptyPitch}
              />
            </Suspense>
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
                      reportPath: buildReportPath(request, slug),
                    })
                  }
                />
              ) : null
            }
          />
          <Suspense fallback={null}>
            <CoTenancyMixSection results={results} radiusKm={request.radius} />
          </Suspense>
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
            <Suspense fallback={null}>
              <VacancyCostCalculator
                key={request.address}
                compact
                initial={vacancyInput}
                onChange={onVacancyChange}
                showPitchOptIn
              />
            </Suspense>
          </div>
          <div className="no-print print-pitch-block">
            <Suspense fallback={null}>
              <StorefrontSizeControl
                sqFt={request.storefrontSqFt ?? 2500}
                onChange={onStorefrontSqFtChange}
              />
            </Suspense>
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
              onChange={onRankingModeChange}
              compact
              className="shrink-0"
            />
            {results.backtestBaseline && (
              <div className="min-w-0 flex-1">
                <Suspense fallback={null}>
                  <QlooProofBanner results={results} compact />
                </Suspense>
              </div>
            )}
          </div>
          <div className="no-print">
            <Suspense fallback={null}>
              <StrictEvalCard results={results} />
            </Suspense>
          </div>
          <div className="no-print">
            <Suspense fallback={null}>
              <ProofSection
                results={results}
                radiusKm={request.radius}
                onBrandSelect={onMapBrandSelect}
                rankingMode={rankingMode}
              />
            </Suspense>
          </div>
          <ErrorBoundary fallback={<CompareUnavailable />}>
            <div className="no-print">
              <Suspense fallback={null}>
                <CompareSection />
              </Suspense>
            </div>
          </ErrorBoundary>
          <div className="no-print">
            <Suspense fallback={null}>
              <HowWeKnowSection results={results} />
            </Suspense>
          </div>
        </ReportCollapsibleSection>
      </ErrorBoundary>
    </>
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
