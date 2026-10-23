import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { formatUserFacingDate } from './format-date';
import { whyBrandBulletLines } from './why-brand-lines';
import { pitchCheckedSourcesLabel } from './copy';

export function pitchExpandedLines(
  prospect: ProspectPack,
  results: AnalysisResponse,
  radiusKm: number
): string[] {
  const lines = whyBrandBulletLines(prospect, results, radiusKm);

  const snapshotDate = formatUserFacingDate(
    results.osmSnapshotRecordedAt ?? results.timestamp
  );
  lines.push(`${pitchCheckedSourcesLabel(prospect)} as of ${snapshotDate}.`);

  return lines;
}
