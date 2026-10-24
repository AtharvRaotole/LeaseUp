import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { brandCategoryLabel } from './brand-category';
import { tasteFitMatchHerePhrase } from './fit-display';
import { shopperInterestHighlight } from './broker-copy';

/** Broker-facing one-line summary built only from fields on the prospect payload. */
export function prospectOneLineReason(
  prospect: ProspectPack,
  results: AnalysisResponse,
  _radiusKm: number
): string {
  const parts: string[] = [];
  const totalScored = results.rankings?.length ?? 0;
  const rank = prospect.brand.affinityRank;

  const tasteLine = tasteFitMatchHerePhrase(rank, totalScored);
  if (tasteLine) parts.push(tasteLine);

  if (prospect.nearestExistingStoreKm !== undefined) {
    const km = prospect.nearestExistingStoreKm;
    const label = km < 10 ? km.toFixed(1) : String(Math.round(km));
    parts.push(`Nearest store is ${label} km away`);
  }

  const taste = prospect.tradeAreaTaste;
  const tasteSignal = taste?.tags?.[0] ?? taste?.audiences?.[0];
  if (tasteSignal?.name?.trim()) {
    parts.push(shopperInterestHighlight(tasteSignal.name.trim()));
  }

  if (prospect.coTenancyLine?.trim()) {
    parts.push(prospect.coTenancyLine.trim());
  }

  const category =
    prospect.tenantMixScore?.categoryFit?.trim() ||
    brandCategoryLabel(prospect.brand.entityId);
  if (category && !prospect.coTenancyLine?.trim()) {
    parts.push(category);
  }

  if (parts.length === 0) return '';
  return `${parts.join('. ')}.`;
}
