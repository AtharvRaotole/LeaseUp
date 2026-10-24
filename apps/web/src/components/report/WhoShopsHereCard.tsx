import type { TradeAreaShoppersSnapshot } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { InfoTooltip } from '../ui/InfoTooltip';

export function WhoShopsHereCard({ snapshot }: { snapshot: TradeAreaShoppersSnapshot }) {
  return (
    <Card className="p-4" data-testid="who-shops-here">
      <div className="flex items-center gap-2">
        <h3 className="text-h3 font-semibold text-ink">Trade area shoppers</h3>
        <InfoTooltip
          label={`Ordered tag names from Qloo location insights (${snapshot.qlooFields.join(', ')}). Affinity scores are not shown because live values cluster near 1.`}
        />
      </div>
      <div className="mt-4 space-y-4">
        {snapshot.groups.map((group) => (
          <section key={group.id} aria-labelledby={`who-shops-${group.id}`}>
            <h4 id={`who-shops-${group.id}`} className="text-sm font-semibold text-ink">
              {group.label}
            </h4>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-ink-2">
              {group.names.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Card>
  );
}
