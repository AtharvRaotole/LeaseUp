import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { displayBrandName } from '../../lib/brand-display';
import { pitchExpandedLines } from '../../lib/pitch-detail-copy';
import { verificationShortLabel, verificationTooltip } from '../../lib/copy';

export function WhyThisBrandCard({
  prospect,
  results,
  radiusKm,
}: {
  prospect: ProspectPack | null;
  results: AnalysisResponse;
  radiusKm: number;
}) {
  if (!prospect) return null;

  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const lines = pitchExpandedLines(prospect, results, radiusKm);

  return (
    <Card className="mb-4 print-pitch-block md:mb-4" data-testid="why-this-brand">
      <h3 className="text-h3 font-semibold text-ink">Why {name}?</h3>
      <p className="mt-1 text-sm text-ink-2">
        {verificationShortLabel(prospect.brand.verified)}:{' '}
        {verificationTooltip(prospect.brand.verified, radiusKm, results.osmSnapshotLabel)}
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
    </Card>
  );
}
