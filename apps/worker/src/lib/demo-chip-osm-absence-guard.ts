import type { ProspectPack } from '@leaseup/contracts';
import type { loadStoreGroundTruthCatalog } from './false-positive-prospect-audit';

const ABSENCE_CLAIM_RE = /no .+ store within \d+(?:\.\d+)? km/i;

export type DemoChipOsmGuardSite = {
  lat: number;
  lon: number;
};

export function demoChipOsmAbsenceViolations(
  catalog: ReturnType<typeof loadStoreGroundTruthCatalog>,
  site: DemoChipOsmGuardSite,
  absenceRadiusKm: number,
  prospects: ProspectPack[],
  maxRank = 10
): string[] {
  const violations: string[] = [];
  for (const [index, pack] of prospects.slice(0, maxRank).entries()) {
    const gt = catalog.presenceForBrand(
      pack.brand.entityId,
      site.lat,
      site.lon,
      absenceRadiusKm
    );
    const osmKm = gt.osmKm;
    if (osmKm === undefined || osmKm > absenceRadiusKm) continue;

    const absenceLine = pack.reasons.find((line) => ABSENCE_CLAIM_RE.test(line));
    if (absenceLine) {
      violations.push(
        `#${index + 1} ${pack.brand.name}: claims "${absenceLine.trim()}" but OSM snapshot has a store at ${osmKm.toFixed(2)} km`
      );
    }
    if (pack.brand.verified === 'verified (2 sources)') {
      violations.push(
        `#${index + 1} ${pack.brand.name}: verified absent but OSM snapshot has a store at ${osmKm.toFixed(2)} km`
      );
    }

    const reported = pack.nearestExistingStoreKm;
    if (
      reported !== undefined &&
      !pack.nearestExistingStoreUnconfirmed &&
      reported > osmKm + 0.25
    ) {
      violations.push(
        `#${index + 1} ${pack.brand.name}: nearest ${reported.toFixed(1)} km but OSM snapshot nearest is ${osmKm.toFixed(2)} km`
      );
    }
  }
  return violations;
}
