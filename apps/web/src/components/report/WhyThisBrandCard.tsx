import type { ReactNode } from 'react';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { cn } from '../../lib/cn';
import { displayBrandName } from '../../lib/brand-display';
import { whyCardStoreCheckLine } from '../../lib/absence-verification-copy';
import { whyBrandTasteSection } from '../../lib/why-brand-taste-ui';
import { BrandReachLink } from './BrandReachLink';
import { analysisStoreDataDateLabel } from '../../lib/store-data-dates';

export function WhyThisBrandCard({
  prospect,
  results,
  radiusKm,
  className,
  actions,
}: {
  prospect: ProspectPack | null;
  results: AnalysisResponse;
  radiusKm: number;
  className?: string;
  actions?: ReactNode;
}) {
  if (!prospect) return null;

  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const taste = whyBrandTasteSection(prospect, results);
  const hasTaste = taste.signalLines.length > 0 || Boolean(taste.summary);

  return (
    <Card className={cn('mb-4 print-pitch-block md:mb-4', className)} data-testid="why-this-brand">
      <h3 className="text-h3 font-semibold text-ink">Why {name}?</h3>

      {hasTaste ? (
        <div className="mt-3 space-y-3" data-testid="why-brand-taste">
          {taste.summary ? (
            <p className="text-sm text-ink">{taste.summary}</p>
          ) : null}
          {taste.signalLines.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-3">
                Qloo taste overlap (local)
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                {taste.signalLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {taste.rankLine ? (
            <p className="text-sm text-ink-2" data-testid="why-brand-rank">{taste.rankLine}</p>
          ) : null}
        </div>
      ) : taste.rankLine ? (
        <p className="mt-3 text-sm text-ink-2">{taste.rankLine}</p>
      ) : null}

      <p className="mt-3 text-sm text-ink-2" data-testid="why-absence-verification">
        {whyCardStoreCheckLine(prospect, radiusKm, results, analysisStoreDataDateLabel(results))}
      </p>

      {prospect.brandReach ? (
        <div className="mt-3" data-testid="why-brand-reach">
          <BrandReachLink reach={prospect.brandReach} />
        </div>
      ) : null}

      {actions && (
        <div className="mt-4 flex flex-wrap gap-2" data-testid="report-brand-card-actions">
          {actions}
        </div>
      )}
    </Card>
  );
}
