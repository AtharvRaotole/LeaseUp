import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { fitPercentileLabel } from './fit-display';
import { pitchOneLineWhy } from './pitch-one-line';
import { prospectOneLineReason } from './prospect-one-line';
import { whyBrandBulletLines } from './why-brand-lines';

/** All broker-facing strings on a report that mention rank or top percent for one brand. */
export function brandReportRankSurfaces(
  prospect: ProspectPack,
  results: AnalysisResponse,
  radiusKm: number
): string[] {
  const total = results.rankings?.length ?? 0;
  const rank = prospect.brand.affinityRank;
  const surfaces: string[] = [
    ...whyBrandBulletLines(prospect, results, radiusKm),
    prospectOneLineReason(prospect, results, radiusKm),
    pitchOneLineWhy(prospect, total),
  ];
  if (total > 0 && rank > 0) {
    surfaces.push(fitPercentileLabel(rank, total));
  }
  if (prospect.reasons[0]) {
    surfaces.push(prospect.reasons[0]);
  }
  return surfaces.filter(Boolean);
}
