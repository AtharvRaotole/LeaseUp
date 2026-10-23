import type { ProspectPack } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { verificationShortLabel } from './copy';
import { fitTopPercentPhrase } from './fit-display';

/** Single line for pitch cards, using only fields returned on the prospect pack. */
export function pitchOneLineWhy(prospect: ProspectPack, rankingsTotal: number): string {
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const rank = prospect.brand.affinityRank;
  const total = rankingsTotal || rank;
  const fitPhrase = fitTopPercentPhrase(rank, total);
  const verify = verificationShortLabel(prospect.brand.verified);

  if (prospect.reasons[0]) {
    return prospect.reasons[0];
  }

  if (prospect.nearestExistingStoreKm !== undefined) {
    return `${name} ranks ${fitPhrase} for taste here (Qloo #${rank}); nearest store is ${prospect.nearestExistingStoreKm.toFixed(1)} km away (${verify}).`;
  }

  return `${name} ranks ${fitPhrase} for taste here (Qloo #${rank}); no store in radius (${verify}).`;
}
