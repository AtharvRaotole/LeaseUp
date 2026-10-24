import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { absenceRadiusKm, prospectNearestStoreKm } from './absence-radius';

export function brandsToPitchDistanceLine(
  prospect: ProspectPack,
  results: AnalysisResponse,
  searchRadiusKm: number
): string {
  const nearest = prospectNearestStoreKm(prospect, results);
  if (nearest !== undefined) {
    return `Closest store ${nearest.toFixed(1)} km`;
  }
  const absenceKm = absenceRadiusKm(results, searchRadiusKm);
  return `No store within ${absenceKm} km`;
}
