import type { AnalysisRequest, AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { HeadlineCard } from './HeadlineCard';
import { displayBrandName } from '../../lib/brand-display';
import { prospectOneLineReason } from '../../lib/prospect-one-line';
import { AddToPipelineButton } from '../pipeline/AddToPipelineButton';
import { pipelineCardFromProspect } from '../../lib/build-pipeline-card';
import { buildReportPath } from '../../lib/report-params';
import { brandMonogram, brandTint } from '../../lib/brand-monogram';
import { cn } from '../../lib/cn';
import type { QlooRankingMode } from './QlooRankingToggle';

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
      />

      {topFive.length > 0 ? (
        <Card data-testid="brands-to-pitch" className="print-pitch-block" data-report-section="top-brands">
          <h3 className="font-display text-h3 font-semibold text-ink">Top brands to pitch</h3>
          <p className="mt-2 text-body text-ink-2">
            {rankingMode === 'baseline'
              ? 'Same pitch list, ordered by national chain size instead of local taste. Tap a row to highlight it on the map.'
              : 'Local taste leaders with no store in your trade area yet. Tap a row to highlight it on the map.'}
          </p>
          <ol className="mt-5 space-y-4" data-testid="report-top-brands-list">
            {topFive.map((prospect, index) => {
              const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
              const reason = prospectOneLineReason(prospect, results, radiusKm);
              const isSelected = selected?.brand.entityId === prospect.brand.entityId;
              return (
                <li key={prospect.brand.entityId}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full gap-4 rounded-card border border-border bg-surface px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      isSelected ? 'border-accent/40 bg-accent-soft/30' : 'hover:bg-surface-2/80'
                    )}
                    onClick={() => onSelectBrand(prospect)}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-small font-semibold text-ink" style={{ background: brandTint(name) }}>
                      {brandMonogram(name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="text-meta text-ink-3">#{index + 1}</span>
                        <span className="font-medium text-body-lg text-ink">{name}</span>
                      </span>
                      <span className="mt-1 block text-body text-ink-2">{reason}</span>
                    </span>
                  </button>
                  <div className="mt-2 pl-14">
                    <AddToPipelineButton
                      size="sm"
                      variant="secondary"
                      wrapperTestId={`add-pipeline-top-${index}`}
                      buildPayload={() =>
                        pipelineCardFromProspect(prospect, results, {
                          reportPath: buildReportPath(request, slug),
                          radiusKm,
                        })
                      }
                    />
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
    </div>
  );
}
