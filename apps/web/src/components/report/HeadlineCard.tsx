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
}: {
  results: AnalysisResponse;
  radiusKm: number;
  chipSlug?: string | null;
  backtestOverride?: AnalysisResponse['backtest'];
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
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 md:mt-7 md:gap-4">
        <StatTile
          label="Nearby match"
          mobileLabel="Nearby"
          value={hitLabel}
          subtitle={hitTieSubtitle ?? 'Top picks with a store in your radius'}
          mobileSubtitle="Stores already in radius"
          tooltip={alreadyNearbyStatTooltip(radiusKm)}
        />
        <StatTile
          label="Brands scored"
          mobileLabel="Scored"
          value={String(analyzed)}
          subtitle="Chains ranked for this address"
          mobileSubtitle="Ranked for this pin"
          tooltip={brandsScoredStatTooltip()}
        />
        <StatTile
          label="Pin confidence"
          mobileLabel="Pin"
          value={dataConfidenceLabel(results.dataQuality)}
          subtitle={dataConfidenceSubtitle(results.dataQuality, results.location)}
          mobileSubtitle="Address and trade area data"
          tooltip={dataConfidenceStatTooltip()}
        />
      </div>
    </Card>
  );
}

function StatTile({
  label,
  mobileLabel,
  value,
  subtitle,
  mobileSubtitle,
  tooltip,
}: {
  label: string;
  mobileLabel: string;
  value: string;
  subtitle: string;
  mobileSubtitle: string;
  tooltip: string;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-control border border-border bg-surface-2 px-2.5 py-2.5 sm:px-3 sm:py-3 md:px-4 md:py-3.5">
      <p className="flex min-h-[1.25rem] items-center gap-0.5 text-[10px] font-medium uppercase leading-tight tracking-wide text-ink-3 sm:text-meta md:text-label">
        <span className="truncate md:hidden">{mobileLabel}</span>
        <span className="hidden truncate md:inline">{label}</span>
        <InfoTooltip label={tooltip} />
      </p>
      <p className="mt-0.5 truncate text-body font-semibold tabular-nums text-ink sm:mt-1 sm:text-body-lg md:text-h3">
        {value}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-ink-3 sm:text-small md:mt-1 md:line-clamp-none md:text-small">
        <span className="md:hidden">{mobileSubtitle}</span>
        <span className="hidden md:inline">{subtitle}</span>
      </p>
    </div>
  );
}
