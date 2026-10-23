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
import { qlooProofHitRateTieSubtitle, qlooProofWinner } from '../../lib/qloo-proof';

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
  const hitTieSubtitle =
    baseline && qlooProofWinner(results.backtest, baseline) === 'tie'
      ? qlooProofHitRateTieSubtitle(results.rankings)
      : null;

  return (
    <Card>
      <h2 className="font-serif text-[28px] leading-[1.2] text-ink md:text-[32px]">
        {count > 0
          ? `${count} brand${count === 1 ? '' : 's'} fit ${area} but have no store within ${radiusKm} km.`
          : `Every top brand for ${area} already has a store within ${radiusKm} km.`}
      </h2>
      <div className="mt-6 grid grid-cols-3 gap-1.5 md:gap-3">
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
    <div className="min-w-0 rounded-control border border-border bg-surface-2 px-2 py-2 transition-colors duration-150 md:px-4 md:py-3">
      <p className="flex items-center gap-0.5 truncate text-[9px] font-medium uppercase tracking-wide text-ink-3 md:text-label">
        <span className="md:hidden">{mobileLabel}</span>
        <span className="hidden md:inline">{label}</span>
        <InfoTooltip label={tooltip} />
      </p>
      <p className="mt-0.5 truncate font-mono text-base tabular-nums text-ink md:mt-1 md:text-h3">{value}</p>
      <p className="mt-1 hidden text-[12px] leading-snug text-ink-3 md:block">{subtitle}</p>
    </div>
  );
}
