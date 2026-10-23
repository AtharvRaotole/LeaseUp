import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { buildCoTenancyMix } from '../../lib/co-tenancy-mix';
import { coTenancyIntroCopy } from '../../lib/co-tenancy-copy';

export function CoTenancyMixSection({
  results,
  radiusKm,
}: {
  results: AnalysisResponse;
  radiusKm: number;
}) {
  const rows = buildCoTenancyMix(results);
  if (rows.length === 0) return null;

  const max = Math.max(1, ...rows.map((r) => Math.max(r.nearbyCount, r.prospectCount)));

  return (
    <section className="no-print" data-testid="co-tenancy-mix">
      <h3 className="mb-3 text-h3 font-semibold text-ink">Co-tenancy mix</h3>
      <Card className="space-y-4">
        <p className="text-sm text-ink-2">{coTenancyIntroCopy(radiusKm)}</p>
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.category}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-ink">{row.category}</span>
                <span className="text-ink-3">
                  {row.nearbyCount} nearby · {row.prospectCount} to pitch
                </span>
              </div>
              <div className="mt-1 flex h-2 overflow-hidden rounded-pill bg-surface-2">
                <div
                  className="bg-ink-3/50"
                  style={{ width: `${(row.nearbyCount / max) * 50}%` }}
                  title="Nearby"
                />
                <div
                  className="bg-accent"
                  style={{ width: `${(row.prospectCount / max) * 50}%` }}
                  title="Prospects"
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
