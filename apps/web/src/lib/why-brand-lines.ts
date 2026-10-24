import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { whyBrandRankSummaryLine as whyBrandRankSummaryLineFromFixtures } from '@leaseup/fixtures';
import { displayBrandName } from './brand-display';

export function whyBrandRankSummaryLine(rank: number, total: number): string {
  return whyBrandRankSummaryLineFromFixtures(rank, total);
}

/** @deprecated prefer whyBrandTasteSection on the report card */
export function whyBrandBulletLines(
  prospect: ProspectPack,
  results: AnalysisResponse,
  _radiusKm: number
): string[] {
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const total = results.rankings?.length ?? 0;
  const rank = prospect.brand.affinityRank;

  const lines: string[] = [];
  const taste = prospect.whyBrandTaste;
  if (taste?.summary) lines.push(taste.summary);
  if (taste?.signals?.length) {
    for (const signal of taste.signals) {
      lines.push(`${signal.kind === 'tag' ? 'Tag' : 'Audience'}: ${signal.name}`);
    }
  }
  if (total > 0 && rank > 0) {
    lines.push(whyBrandRankSummaryLine(rank, total));
  } else if (lines.length === 0) {
    lines.push(`Strong local shopper match for ${name}.`);
  }
  return lines;
}
