import type { AnalysisResponse } from '@leaseup/contracts';
import { absenceRadiusKm } from './absence-radius';

export function reportHeadlineLine(
  results: AnalysisResponse,
  area: string,
  searchRadiusKm: number
): string {
  const count = results.prospects.length;
  const absenceKm = absenceRadiusKm(results, searchRadiusKm);
  if (count > 0) {
    return `${count} brand${count === 1 ? '' : 's'} fit ${area} but have no store within ${absenceKm} km.`;
  }
  return `Every top brand for ${area} already has a store within ${absenceKm} km.`;
}
