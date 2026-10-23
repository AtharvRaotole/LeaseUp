import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { whyBrandBulletLines } from './why-brand-lines';

/** Plain one-line reason for summary lists; uses stored outreach reasons when present. */
export function prospectOneLineReason(
  prospect: ProspectPack,
  results: AnalysisResponse,
  radiusKm: number
): string {
  const fromReasons = prospect.reasons?.find((r) => r.trim().length > 0);
  if (fromReasons) return fromReasons;
  const lines = whyBrandBulletLines(prospect, results, radiusKm);
  return lines[0] ?? 'Local taste fit for this trade area.';
}
