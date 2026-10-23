import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { dataConfidenceLabel, dataConfidenceSubtitle } from '../../lib/copy';
import { placeHeadlineLabel } from '../../lib/location-label';

export function HeadlineCard({
  results,
  radiusKm,
  chipSlug,
}: {
  results: AnalysisResponse;
  radiusKm: number;
  chipSlug?: string | null;
}) {
  const count = results.prospects.length;
  const area = placeHeadlineLabel(results.location, chipSlug);
  const present = results.backtest.presentInTop10 ?? Math.round(results.backtest.precisionAt10 * 10);
  const hitLabel = `${present} of 10`;
  const analyzed = results.rankings?.length ?? 0;

  return (
    <Card>
      <h2 className="font-serif text-[40px] leading-[1.15] text-ink">
        {count > 0
          ? `${count} brand${count === 1 ? '' : 's'} fit ${area} but have no store within ${radiusKm} km.`
          : `Every top brand for ${area} already has a store within ${radiusKm} km.`}
      </h2>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:pb-0">
        <StatTile
          label="Hit rate"
          value={hitLabel}
          subtitle="Top 10 brands with a store nearby"
        />
        <StatTile label="Brands analyzed" value={String(analyzed)} subtitle="Brands ranked for this pin in Qloo" />
        <StatTile
          label="Data confidence"
          value={dataConfidenceLabel(results.dataQuality)}
          subtitle={dataConfidenceSubtitle(results.dataQuality, results.location)}
        />
      </div>
    </Card>
  );
}

function StatTile({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="min-w-[7.5rem] shrink-0 flex-1 rounded-control border border-border bg-surface-2 px-3 py-2 md:min-w-0 md:px-4 md:py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-3 md:text-label">{label}</p>
      <p className="mt-0.5 font-mono text-lg tabular-nums text-ink md:mt-1 md:text-h3">{value}</p>
      <p className="mt-1 hidden text-[12px] leading-snug text-ink-3 md:block">{subtitle}</p>
    </div>
  );
}
