import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { fitTopPercentPhrase } from './fit-display';
import { absenceVerificationSummary } from './absence-verification-copy';
import { formatTradeAreaTasteRow } from './trade-area-taste-copy';

export function whyBrandBulletLines(
  prospect: ProspectPack,
  results: AnalysisResponse,
  radiusKm: number
): string[] {
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const total = results.rankings?.length ?? 0;
  const rank = prospect.brand.affinityRank;
  const topPhrase = fitTopPercentPhrase(rank, total || rank);

  const lines: string[] = [
    `Ranked #${rank} of ${total || 'many'} brands for local taste (${topPhrase}).`,
  ];

  if (prospect.nearestExistingStoreKm !== undefined) {
    lines.push(`Nearest ${name} is ${prospect.nearestExistingStoreKm.toFixed(1)} km away.`);
  } else {
    lines.push(absenceVerificationSummary(prospect, radiusKm, results));
  }

  const taste = prospect.tradeAreaTaste;
  if (taste?.tags?.length) {
    lines.push(
      `Local tags over-indexing for ${name}: ${taste.tags.map(formatTradeAreaTasteRow).join('; ')}.`
    );
  }
  if (taste?.audiences?.length) {
    lines.push(
      `Local audiences over-indexing for ${name}: ${taste.audiences.map(formatTradeAreaTasteRow).join('; ')}.`
    );
  }

  return lines;
}
