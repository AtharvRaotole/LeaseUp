import type { ProspectFunnel, ProspectPack } from '@leaseup/contracts';

export function buildProspectFunnel(input: {
  brandsScored: number;
  searchRadiusKm: number;
  absenceRadiusKm: number;
  alreadyNearbyCount: number;
  strongFitAbsentCount: number;
  pitchedCount: number;
  prospects: ProspectPack[];
}): ProspectFunnel {
  const verifiedCount = input.prospects.filter(
    (p) => p.brand.verified === 'verified (2 sources)'
  ).length;
  return {
    brandsScored: input.brandsScored,
    searchRadiusKm: input.searchRadiusKm,
    absenceRadiusKm: input.absenceRadiusKm,
    alreadyNearbyCount: input.alreadyNearbyCount,
    strongFitAbsentCount: input.strongFitAbsentCount,
    pitchedCount: input.pitchedCount,
    verifiedCount,
  };
}
