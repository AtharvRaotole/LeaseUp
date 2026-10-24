import type { ProspectFunnel } from '@leaseup/contracts';

export function prospectFunnelPlainLine(funnel: ProspectFunnel): string {
  const radiusLabel =
    funnel.absenceRadiusKm < funnel.searchRadiusKm
      ? `${funnel.absenceRadiusKm} km (tighter in dense areas; you picked ${funnel.searchRadiusKm} km on the map)`
      : `${funnel.absenceRadiusKm} km`;

  return (
    `${funnel.brandsScored} brands scored. ` +
    `Within ${radiusLabel}, ${funnel.alreadyNearbyCount} already have a store nearby, ` +
    `${funnel.strongFitAbsentCount} strong local fits have none, ` +
    `and we are pitching ${funnel.pitchedCount}` +
    (funnel.verifiedCount > 0
      ? ` (${funnel.verifiedCount} verified in two sources).`
      : '.')
  );
}
