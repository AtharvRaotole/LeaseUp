import type { ProspectFunnel } from '@leaseup/contracts';

/** Plain line under the report headline and on the trade-area chip tooltip when radii differ. */
export function searchVsAbsenceRadiusPlainLine(
  searchRadiusKm: number,
  absenceRadiusKm: number
): string {
  const base =
    `We search ${searchRadiusKm} km for shoppers, and count a brand as missing only if it has no store within ${absenceRadiusKm} km`;
  if (absenceRadiusKm < searchRadiusKm) {
    return `${base}, since dense areas are crowded.`;
  }
  return `${base}.`;
}

export function prospectFunnelPlainLine(funnel: ProspectFunnel): string {
  const withoutStoreInRadius = funnel.brandsScored - funnel.alreadyNearbyCount;
  return (
    `${funnel.brandsScored} brands scored. ` +
    `${funnel.alreadyNearbyCount} already have a store within ${funnel.absenceRadiusKm} km. ` +
    `${funnel.pitchedCount} of the ${withoutStoreInRadius} without a store in that radius fit local taste and made this pitch list.`
  );
}
