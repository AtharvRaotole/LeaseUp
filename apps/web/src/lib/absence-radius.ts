import type { AnalysisResponse, PitchPackSnapshot } from '@leaseup/contracts';

/** Km used for "no store within N km" absence claims (pitch list), not the map search circle. */
export function absenceRadiusKm(
  results: AnalysisResponse | undefined,
  searchRadiusKm: number
): number {
  return results?.prospectFunnel?.absenceRadiusKm ?? searchRadiusKm;
}

export function pitchPackAbsenceRadiusKm(snapshot: PitchPackSnapshot): number {
  return snapshot.absenceRadiusKm ?? snapshot.radiusKm;
}

const WITHIN_KM_RE = /within (\d+(?:\.\d+)?) km/gi;

/** Largest "within N km" radius stated in copy (absence claims). */
export function maxStatedAbsenceRadiusKm(text: string): number | undefined {
  let max: number | undefined;
  for (const match of text.matchAll(WITHIN_KM_RE)) {
    const n = Number(match[1]);
    if (!Number.isFinite(n)) continue;
    max = max === undefined ? n : Math.max(max, n);
  }
  return max;
}

export function prospectNearestStoreKm(
  prospect: { brand: { entityId: string }; nearestExistingStoreKm?: number },
  results: AnalysisResponse
): number | undefined {
  if (prospect.nearestExistingStoreKm !== undefined) {
    return prospect.nearestExistingStoreKm;
  }
  const row = results.rankings?.find((r) => r.entityId === prospect.brand.entityId);
  return row?.nearestStoreKm;
}
