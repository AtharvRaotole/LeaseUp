import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { InfoTooltip } from '../ui/InfoTooltip';
import { dataConfidenceLabel, dataConfidenceSubtitle } from '../../lib/copy';
import { placeHeadlineLabel } from '../../lib/location-label';
import {
  alreadyNearbyStatLabel,
  alreadyNearbyStatTooltip,
  brandsScoredStatTooltip,
  dataConfidenceStatTooltip,
} from '../../lib/broker-copy';
import { presentInTop10Count } from '../../lib/hit-rate';
export function HeadlineCard({
  results,
  radiusKm,
  chipSlug,
  backtestOverride,
  showStats = true,
}: {
  results: AnalysisResponse;
  radiusKm: number;
  chipSlug?: string | null;
  backtestOverride?: AnalysisResponse['backtest'];
  /** When false, only the headline renders (stats deferred for faster LCP). */
  showStats?: boolean;
}) {
  const count = results.prospects.length;
  const area = placeHeadlineLabel(results.location, chipSlug);
  const activeBacktest = backtestOverride ?? results.backtest;
  const hitLabel = alreadyNearbyStatLabel(activeBacktest);
  const analyzed = results.rankings?.length ?? 0;
  const baseline = results.backtestBaseline;
  const blendBacktest = results.backtestBlended ?? results.backtest;
  const blendHits = presentInTop10Count(blendBacktest);
  const chainHits = baseline ? presentInTop10Count(baseline) : 0;
  const hitTieSubtitle =
    baseline && blendHits === chainHits
      ? `At this pin, taste-aware ranking and store count tie at ${blendHits} of 10 in the trade area.`
      : null;

  return (
    <Card>
      <h2 className="font-display font-semibold text-h2 leading-snug text-ink md:text-title">
        {count > 0
          ? `${count} brand${count === 1 ? '' : 's'} fit ${area} but have no store within ${radiusKm} km.`
          : `Every top brand for ${area} already has a store within ${radiusKm} km.`}
      </h2>
      {showStats && (
      <div className="mt-8 grid grid-cols-3 gap-3 md:gap-4">
        <StatTile
          label="Nearby match"
          mobileLabel="Nearby"
          value={hitLabel}
          subtitle={hitTieSubtitle ?? 'Top picks that already have a store in your radius'}
          tooltip={alreadyNearbyStatTooltip(radiusKm)}
        />
        <StatTile
          label="Brands scored"
          mobileLabel="Scored"
          value={String(analyzed)}
          subtitle="Chains ranked for this address"
          tooltip={brandsScoredStatTooltip()}
        />
        <StatTile
          label="Pin confidence"
          mobileLabel="Pin"
          value={dataConfidenceLabel(results.dataQuality)}
          subtitle={dataConfidenceSubtitle(results.dataQuality, results.location)}
          tooltip={dataConfidenceStatTooltip()}
        />
      </div>
      )}
    </Card>
  );
}

function StatTile({
  label,
  mobileLabel,
  value,
  subtitle,
  tooltip,
}: {
  label: string;
  mobileLabel: string;
  value: string;
  subtitle: string;
  tooltip: string;
}) {
  return (
    <div className="min-w-0 rounded-control border border-border bg-surface-2 px-3 py-3 transition-colors duration-150 md:px-4 md:py-4">
      <p className="flex items-center gap-0.5 truncate text-meta font-medium uppercase tracking-wide text-ink-3 md:text-label">
        <span className="md:hidden">{mobileLabel}</span>
        <span className="hidden md:inline">{label}</span>
        <InfoTooltip label={tooltip} />
      </p>
      <p className="mt-1 truncate text-body-lg font-semibold tabular-nums text-ink md:text-h3">{value}</p>
      <p className="mt-1 hidden text-small leading-snug text-ink-3 md:block">{subtitle}</p>
    </div>
  );
}
