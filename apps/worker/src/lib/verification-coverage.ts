/** How far we scan for metro-level store coverage consistency checks. */
export const METRO_COVERAGE_SCAN_KM = 50;

/** Chains at or above this national count should have metro coverage in both sources when possible. */
export const METRO_COVERAGE_MIN_NATIONAL = 40;

export type MetroCoverageInput = {
  nationalStoreCount: number;
  nearestAtpKm?: number;
  nearestOsmKm?: number;
};

export type MetroCoverageResult = {
  incomplete: boolean;
  reason?: string;
};

function withinMetroScan(km?: number): boolean {
  return km !== undefined && km <= METRO_COVERAGE_SCAN_KM;
}

/**
 * Returns true when a large chain has stores in one dataset within the metro scan
 * radius but the other dataset shows none, so 2-source "verified absent" is unsafe.
 */
export function metroStoreCoverageIncomplete(input: MetroCoverageInput): MetroCoverageResult {
  if (input.nationalStoreCount < METRO_COVERAGE_MIN_NATIONAL) {
    return { incomplete: false };
  }

  const atpInMetro = withinMetroScan(input.nearestAtpKm);
  const osmInMetro = withinMetroScan(input.nearestOsmKm);

  if (atpInMetro && !osmInMetro) {
    return {
      incomplete: true,
      reason:
        'OpenStreetMap has no locations within 50 km while All The Places lists stores in this metro.',
    };
  }
  if (osmInMetro && !atpInMetro) {
    return {
      incomplete: true,
      reason:
        'All The Places has no locations within 50 km while OpenStreetMap lists stores in this metro.',
    };
  }

  return { incomplete: false };
}
