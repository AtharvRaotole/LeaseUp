import type { ProspectFunnel } from '@leaseup/contracts';

export function prospectFunnelPlainLine(funnel: ProspectFunnel): string {
  return (
    `${funnel.brandsScored} brands scored. ` +
    `${funnel.alreadyNearbyCount} already have a store within ${funnel.absenceRadiusKm} km. ` +
    `These ${funnel.pitchedCount} fit local taste and have none.`
  );
}
