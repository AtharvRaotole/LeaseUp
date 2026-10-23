import type { ReactNode } from 'react';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { cn } from '../../lib/cn';
import { displayBrandName } from '../../lib/brand-display';
import { pitchExpandedLines } from '../../lib/pitch-detail-copy';
import { absenceVerificationSummary } from '../../lib/absence-verification-copy';

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
  const lines = pitchExpandedLines(prospect, results, radiusKm);

  return (
    <Card className={cn('mb-4 print-pitch-block md:mb-4', className)} data-testid="why-this-brand">
      <h3 className="text-h3 font-semibold text-ink">Why {name}?</h3>
      <p className="mt-1 text-sm text-ink-2" data-testid="why-absence-verification">
        {absenceVerificationSummary(prospect, radiusKm, results)}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-ink-2">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {prospect.reasons.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2">
          {prospect.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {actions && (
        <div className="mt-4 flex flex-wrap gap-2" data-testid="report-pipeline-cta">
          {actions}
        </div>
      )}
    </Card>
  );
}
