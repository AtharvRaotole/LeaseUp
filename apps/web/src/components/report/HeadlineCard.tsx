import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { dataConfidenceLabel, dataConfidenceSubtitle } from '../../lib/copy';
import { placeHeadlineLabel } from '../../lib/location-label';
import { hitRateStatLabel } from '../../lib/hit-rate';

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
  const hitLabel = hitRateStatLabel(backtestOverride ?? results.backtest);
  const analyzed = results.rankings?.length ?? 0;

  return (
    <Card>
      <h2 className="font-serif text-[40px] leading-[1.15] text-ink">
        {count > 0
          ? `${count} brand${count === 1 ? '' : 's'} fit ${area} but have no store within ${radiusKm} km.`
          : `Every top brand for ${area} already has a store within ${radiusKm} km.`}
      </h2>
      <div className="mt-6 grid grid-cols-3 gap-1.5 md:gap-3">
        <StatTile
          label="Hit rate"
          mobileLabel="Hit rate"
          value={hitLabel}
          subtitle="Top 10 brands with a store nearby"
        />
        <StatTile
          label="Brands analyzed"
          mobileLabel="Brands"
          value={String(analyzed)}
          subtitle="Brands ranked for this pin in Qloo"
        />
        <StatTile
          label="Data confidence"
          mobileLabel="Confidence"
          value={dataConfidenceLabel(results.dataQuality)}
          subtitle={dataConfidenceSubtitle(results.dataQuality, results.location)}
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
}: {
  label: string;
  mobileLabel: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="min-w-0 rounded-control border border-border bg-surface-2 px-2 py-2 md:px-4 md:py-3">
      <p className="truncate text-[9px] font-medium uppercase tracking-wide text-ink-3 md:text-label">
        <span className="md:hidden">{mobileLabel}</span>
        <span className="hidden md:inline">{label}</span>
      </p>
      <p className="mt-0.5 truncate font-mono text-base tabular-nums text-ink md:mt-1 md:text-h3">{value}</p>
      <p className="mt-1 hidden text-[12px] leading-snug text-ink-3 md:block">{subtitle}</p>
    </div>
  );
}
