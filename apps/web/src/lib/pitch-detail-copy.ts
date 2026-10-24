import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { analysisStoreDataDateLabel } from './store-data-dates';
import { whyBrandBulletLines } from './why-brand-lines';
import { pitchCheckedSourcesLabel } from './copy';

export function pitchExpandedLines(
  prospect: ProspectPack,
  results: AnalysisResponse,
  radiusKm: number
): string[] {
  const lines = whyBrandBulletLines(prospect, results, radiusKm);

  lines.push(
    `${pitchCheckedSourcesLabel(prospect)} as of ${analysisStoreDataDateLabel(results)}.`
  );

  return lines;
}
