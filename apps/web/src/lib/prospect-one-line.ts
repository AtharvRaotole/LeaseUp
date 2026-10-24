import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { brandCategoryLabel } from './brand-category';
import { tasteFitMatchHerePhrase } from './fit-display';
import { pickRetailShopperTasteLabel } from '@leaseup/fixtures';
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
  const shopperTaste = pickRetailShopperTasteLabel(taste?.tags ?? [], taste?.audiences ?? []);
  if (shopperTaste) {
    parts.push(shopperInterestHighlight(shopperTaste));
  }

  const category =
    prospect.tenantMixScore?.categoryFit?.trim() ||
    brandCategoryLabel(prospect.brand.entityId);
  if (category) {
    parts.push(category);
  }

  if (parts.length === 0) return '';
  return `${parts.join('. ')}.`;
}
