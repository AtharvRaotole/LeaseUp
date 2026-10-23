import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { fitPercentileFromRank } from './fit-display';

function formatRecordedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function pitchExpandedLines(
  prospect: ProspectPack,
  results: AnalysisResponse,
  radiusKm: number
): string[] {
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const total = results.rankings?.length ?? 0;
  const rank = prospect.brand.affinityRank;
  const topPct = fitPercentileFromRank(rank, total || rank);

  const lines: string[] = [
    `Ranked #${rank} of ${total || 'many'} brands for local taste (top ${topPct}%).`,
  ];

  if (prospect.nearestExistingStoreKm !== undefined) {
    lines.push(`Nearest ${name} is ${prospect.nearestExistingStoreKm.toFixed(1)} km away.`);
  } else {
    lines.push(`No ${name} store within ${radiusKm} km.`);
  }

  lines.push(
    `Checked against All The Places and OpenStreetMap on ${formatRecordedDate(results.timestamp)}.`
  );

  return lines;
}
