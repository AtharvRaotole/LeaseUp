import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { formatUserFacingDate } from './format-date';
import { whyBrandBulletLines } from './why-brand-lines';

export function pitchExpandedLines(
  prospect: ProspectPack,
  results: AnalysisResponse,
  radiusKm: number
): string[] {
  const lines = whyBrandBulletLines(prospect, results, radiusKm);

  const snapshotDate = formatUserFacingDate(
    results.osmSnapshotRecordedAt ?? results.timestamp
  );
  const osmLabel = results.osmSnapshotLabel ?? 'OpenStreetMap';
  lines.push(`Store checks use All The Places and ${osmLabel} as of ${snapshotDate}.`);

  return lines;
}
