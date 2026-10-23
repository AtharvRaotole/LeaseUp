import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { fitTopPercentPhrase } from './fit-display';
import { formatUserFacingDate } from './format-date';

export function pitchExpandedLines(
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
    lines.push(`No ${name} store within ${radiusKm} km.`);
  }

  lines.push(
    `Checked against All The Places and ${results.osmSnapshotLabel ?? 'OpenStreetMap'} on ${formatUserFacingDate(results.osmSnapshotRecordedAt ?? results.timestamp)}.`
  );

  return lines;
}
