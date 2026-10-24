import type { AnalysisRequest, AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { HeadlineCard } from './HeadlineCard';
import { displayBrandName } from '../../lib/brand-display';
import { prospectOneLineReason } from '../../lib/prospect-one-line';
import { prospectBrandCategoryLabel } from '../../lib/prospect-brand-category';
import { ProspectCategoryChip } from './ProspectCategoryChip';
import { AddToPipelineButton } from '../pipeline/AddToPipelineButton';
import { pipelineCardFromProspect } from '../../lib/build-pipeline-card';
import { buildReportPath } from '../../lib/report-params';
import { brandMonogram, brandTint } from '../../lib/brand-monogram';
import { cn } from '../../lib/cn';
import type { QlooRankingMode } from './QlooRankingToggle';
import { ReportProspectFunnel } from './ReportProspectFunnel';
import { ReportVacancyAboveFold } from './ReportVacancyAboveFold';
import { ReportTourHintChip } from './ReportFirstRunTour';
import type { VacancyCalculatorDraft } from '../../lib/vacancy-cost';

export function ReportSummaryAboveFold({
  results,
  request,
  slug,
  radiusKm,
  chipSlug,
  backtestOverride,
  pitchProspects,
  rankingMode,
  selected,
  onSelectBrand,
  onSharePitch,
  showHeadlineStats = true,
  showBrandPitchDetails = true,
  showPrimaryActions = true,
  vacancyInput,
  onVacancyChange,
}: {
  results: AnalysisResponse;
  request: AnalysisRequest;
  slug: string;
  radiusKm: number;
  chipSlug?: string | null;
  backtestOverride?: AnalysisResponse['backtest'];
  pitchProspects: ProspectPack[];
  rankingMode: QlooRankingMode;
  selected: ProspectPack | null;
  onSelectBrand: (p: ProspectPack) => void;
  onSharePitch: () => void;
  showHeadlineStats?: boolean;
  /** When false, brand rows render without one-line reasons or per-row pipeline CTAs (mobile LCP/TBT). */
  showBrandPitchDetails?: boolean;
  showPrimaryActions?: boolean;
  vacancyInput: VacancyCalculatorDraft;
  onVacancyChange: (next: VacancyCalculatorDraft) => void;
}) {
  const topFive = pitchProspects.slice(0, 5);
  const pipelineProspect = selected ?? topFive[0] ?? null;

  return (
    <div className="space-y-8" data-testid="report-summary">
      <HeadlineCard
        results={results}
        radiusKm={radiusKm}
        chipSlug={chipSlug}
        backtestOverride={backtestOverride}
        showStats={showHeadlineStats}
        headlineActions={<ReportTourHintChip />}
        headingLevel="h1"
      />

      {results.prospectFunnel && (
        <ReportProspectFunnel funnel={results.prospectFunnel} />
      )}

      {topFive.length > 0 ? (
        <Card data-testid="brands-to-pitch" className="print-pitch-block" data-report-section="top-brands">
          <h3 className="font-display text-h3 font-semibold text-ink">Top brands to pitch</h3>
          <p className="mt-2 text-body text-ink-2">
            {rankingMode === 'baseline'
              ? 'Same pitch list, ordered by national chain size instead of local taste. Tap a row to highlight it on the map.'
              : 'Local taste leaders with no store in your trade area yet. Tap a row to highlight it on the map.'}
          </p>
          <ol className="mt-4 space-y-2.5" data-testid="report-top-brands-list">
            {topFive.map((prospect, index) => {
              const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
              const reason = showBrandPitchDetails
                ? prospectOneLineReason(prospect, results, radiusKm)
                : '';
              const categoryTag =
                showBrandPitchDetails && !prospect.coTenancyLine?.trim()
                  ? prospectBrandCategoryLabel(prospect)
                  : undefined;
              const isSelected = selected?.brand.entityId === prospect.brand.entityId;
              return (
                <li key={prospect.brand.entityId} className="group">
                  <div
                    className={cn(
                      'flex items-stretch gap-0 overflow-hidden rounded-card border border-border bg-surface transition-colors',
                      isSelected ? 'border-accent/40 bg-accent-soft/25' : 'hover:bg-surface-2/60'
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:gap-4 sm:px-4"
                      onClick={() => onSelectBrand(prospect)}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-small font-semibold text-ink sm:h-10 sm:w-10"
                        style={{ background: brandTint(name) }}
                      >
                        {brandMonogram(name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-meta font-medium text-ink-3">#{index + 1}</span>
                          <span className="font-medium text-body text-ink sm:text-body-lg">{name}</span>
                        </span>
                        {showBrandPitchDetails && (reason || categoryTag) ? (
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-small leading-snug text-ink-2 sm:text-body">
                            {reason ? <span className="min-w-0">{reason}</span> : null}
                            {categoryTag ? (
                              <ProspectCategoryChip label={categoryTag} data-testid="prospect-category-chip" />
                            ) : null}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    {showBrandPitchDetails ? (
                      <div
                        className={cn(
                          'flex shrink-0 items-center border-l border-border/70 px-2 py-2 sm:px-3',
                          'opacity-100 transition-opacity',
                          'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
                        )}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <AddToPipelineButton
                          size="sm"
                          variant="ghost"
                          compact
                          showPipelineLink={false}
                          className="shrink-0"
                          wrapperTestId={`add-pipeline-top-${index}`}
                          buildPayload={() =>
                            pipelineCardFromProspect(prospect, results, {
                              reportPath: buildReportPath(request, slug),
                              radiusKm,
                            })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      ) : (
        <Card data-testid="brands-to-pitch" className="print-pitch-block text-center">
          <h3 className="text-h3 font-semibold text-ink">No brands to pitch here</h3>
          <p className="mt-2 text-sm text-ink-2">
            Every strong taste match already has a store in this radius.
          </p>
        </Card>
      )}

      <ReportVacancyAboveFold draft={vacancyInput} onChange={onVacancyChange} />

      {showPrimaryActions ? (
        <div
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          data-testid="report-primary-actions"
        >
          <Button type="button" size="md" variant="primary" onClick={onSharePitch}>
            Share pitch pack
          </Button>
          {pipelineProspect && (
            <AddToPipelineButton
              size="md"
              variant="secondary"
              wrapperTestId="report-pipeline-cta"
              buildPayload={() =>
                pipelineCardFromProspect(pipelineProspect, results, {
                  reportPath: buildReportPath(request, slug),
                  radiusKm,
                })
              }
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
