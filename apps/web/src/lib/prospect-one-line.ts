import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { tasteFitMatchHerePhrase } from './fit-display';
import { isNonRetailTasteName } from '@leaseup/fixtures';
import { nearestChainStoreDistanceUnconfirmedLine } from '@leaseup/fixtures';
import { localAudiencePitchHighlight } from './broker-copy';

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

  if (prospect.nearestExistingStoreUnconfirmed) {
    parts.push(nearestChainStoreDistanceUnconfirmedLine());
  } else if (prospect.nearestExistingStoreKm !== undefined) {
    const km = prospect.nearestExistingStoreKm;
    const label = km < 10 ? km.toFixed(1) : String(Math.round(km));
    parts.push(`Nearest tracked chain store is ${label} km away`);
  }

  const pairingLine = prospect.coTenancyLine?.trim();
  if (pairingLine) {
    parts.push(pairingLine);
  } else {
    // Only verified brand x local overlap (whyBrandTaste); never location-only rows, and never a
    // non-retail theme such as Hotel or Self Help.
    const tasteSignal = prospect.whyBrandTaste?.signals?.find((s) => !isNonRetailTasteName(s));
    if (tasteSignal) {
      parts.push(localAudiencePitchHighlight(tasteSignal.name.trim()));
    }
  }

  if (parts.length === 0) return '';
  return `${parts.join('. ')}.`;
}
