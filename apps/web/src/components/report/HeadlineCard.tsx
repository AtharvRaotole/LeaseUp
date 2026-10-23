import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { dataConfidenceLabel } from '../../lib/copy';

export function HeadlineCard({ results, radiusKm }: { results: AnalysisResponse; radiusKm: number }) {
  const count = results.prospects.length;
  const area =
    results.location.neighborhood || results.location.city || results.location.address;
  const present = results.backtest.presentInTop10 ?? Math.round(results.backtest.precisionAt10 * 10);
  const hitLabel = `${present} of 10`;
  const analyzed = results.rankings?.length ?? 0;

  return (
    <Card>
      <h2 className="font-serif text-[40px] leading-[1.15] text-ink">
        {count > 0
          ? `${count} brands fit ${area} but have no store within ${radiusKm} km.`
          : `Top brands around ${area} already have nearby stores within ${radiusKm} km.`}
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Hit rate"
          value={hitLabel}
          hint="Of Qloo's top 10 brands for this area, how many already have a store nearby. Higher means the signal matches reality."
        />
        <StatTile label="Brands analyzed" value={String(analyzed)} hint="Brands ranked for this pin in Qloo." />
        <StatTile
          label="Data confidence"
          value={dataConfidenceLabel(results.dataQuality)}
          hint={results.warnings[0] || 'Based on ranking depth and backtest match.'}
        />
      </div>
    </Card>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-control border border-border bg-surface-2 px-4 py-3" title={hint}>
      <p className="text-label uppercase text-ink-3">{label}</p>
      <p className="mt-1 font-mono text-h3 tabular-nums text-ink">{value}</p>
    </div>
  );
}
