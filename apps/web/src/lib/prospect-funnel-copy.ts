import type { ProspectFunnel } from '@leaseup/contracts';

export function prospectFunnelPlainLine(funnel: ProspectFunnel): string {
  const withoutStoreInRadius = funnel.brandsScored - funnel.alreadyNearbyCount;
  return (
    `${funnel.brandsScored} brands scored. ` +
    `${funnel.alreadyNearbyCount} already have a store within ${funnel.absenceRadiusKm} km. ` +
    `${funnel.pitchedCount} of the ${withoutStoreInRadius} without a store in that radius fit local taste and made this pitch list.`
  );
}
