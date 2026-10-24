import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { brandCategoryLabel } from './brand-category';
import { tasteFitMatchHerePhrase } from './fit-display';
import { isNonRetailTasteName } from '@leaseup/fixtures';
import { audienceOverlapHighlight } from './broker-copy';

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

  // Only verified brand x local overlap (whyBrandTaste); never location-only rows, and never a
  // non-retail theme such as Hotel or Self Help.
  const tasteSignal = prospect.whyBrandTaste?.signals?.find((s) => !isNonRetailTasteName(s));
  if (tasteSignal) {
    parts.push(audienceOverlapHighlight(tasteSignal.name.trim()));
  }

  const categoryRaw =
    prospect.tenantMixScore?.categoryFit?.trim() ||
    brandCategoryLabel(prospect.brand.entityId);
  if (categoryRaw) {
    const category = categoryRaw.replace(/\.$/, '').trim();
    if (category) parts.push(`Category fit: ${category}`);
  }

  if (parts.length === 0) return '';
  return `${parts.join('. ')}.`;
}
