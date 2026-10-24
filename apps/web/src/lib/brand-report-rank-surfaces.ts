import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { brandRankSurfaceStrings } from '@leaseup/fixtures';
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
  const core = brandRankSurfaceStrings(rank, total, prospect.reasons[0]);
  const surfaces: string[] = [
    ...whyBrandBulletLines(prospect, results, radiusKm),
    prospectOneLineReason(prospect, results, radiusKm),
    pitchOneLineWhy(prospect, total),
    ...core,
  ];
  return [...new Set(surfaces.filter(Boolean))];
}
