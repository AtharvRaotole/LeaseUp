import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { absenceVerificationSummary, whyCardStoreCheckLine } from './absence-verification-copy';
import { analysisStoreDataDateLabel } from './store-data-dates';
import { brandsToPitchDistanceLine } from './brands-to-pitch-copy';
import { reportHeadlineLine } from './report-headline-copy';
import { placeHeadlineLabel } from './location-label';
import { pitchExpandedLines } from './pitch-detail-copy';
import { absenceRadiusKm, maxStatedAbsenceRadiusKm, prospectNearestStoreKm } from './absence-radius';

/** All user-visible strings that state an absence radius for one prospect. */
export function absenceClaimTextsForProspect(
  prospect: ProspectPack,
  results: AnalysisResponse,
  searchRadiusKm: number,
  areaLabel?: string
): string[] {
  const area = areaLabel ?? placeHeadlineLabel(results.location, null);
  const texts = [
    reportHeadlineLine(results, area, searchRadiusKm),
    brandsToPitchDistanceLine(prospect, results, searchRadiusKm),
    absenceVerificationSummary(prospect, searchRadiusKm, results),
    whyCardStoreCheckLine(prospect, searchRadiusKm, results, analysisStoreDataDateLabel(results)),
    ...pitchExpandedLines(prospect, results, searchRadiusKm),
    ...prospect.reasons,
  ];
  return texts.filter(Boolean);
}

export function assertAbsenceCopyMatchesNearestStore(
  prospect: ProspectPack,
  results: AnalysisResponse,
  searchRadiusKm: number,
  areaLabel?: string
): void {
  const nearest = prospectNearestStoreKm(prospect, results);
  if (nearest === undefined) return;
  const texts = absenceClaimTextsForProspect(prospect, results, searchRadiusKm, areaLabel);
  const expectedMax = absenceRadiusKm(results, searchRadiusKm);
  for (const text of texts) {
    const stated = maxStatedAbsenceRadiusKm(text);
    if (stated === undefined) continue;
    if (stated > nearest) {
      throw new Error(
        `Stated absence ${stated} km exceeds nearest store ${nearest} km: ${text.slice(0, 120)}`
      );
    }
    if (stated > expectedMax + 0.01) {
      throw new Error(
        `Stated absence ${stated} km exceeds prospect funnel ${expectedMax} km: ${text.slice(0, 120)}`
      );
    }
  }
}
