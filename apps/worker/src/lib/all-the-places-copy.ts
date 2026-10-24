/** User-facing store-data wording. Never use the ATP acronym in API or export copy. */

export const ALL_THE_PLACES_STORE_DATA_TAG = '(All The Places store data)';

export function noStoreWithinRadiusReason(displayName: string, radiusKm: number): string {
  return `No ${displayName} store within ${radiusKm} km ${ALL_THE_PLACES_STORE_DATA_TAG}`;
}

export const VERIFY_STEP_LABEL = 'Double-check absence (All The Places + OpenStreetMap)';

export const COVERAGE_SHOWING_ALL_THE_PLACES_ONLY =
  'showing All The Places store data only';

export function coverageOsmFetchFailedNote(): string {
  return `OpenStreetMap snapshot fetch failed for this brand; ${COVERAGE_SHOWING_ALL_THE_PLACES_ONLY}.`;
}

/** One line when OSM snapshot has no mapping for this brand (missing Wikidata QID). */
export const COVERAGE_BRAND_NOT_IN_OSM_SNAPSHOT =
  'Store locations from All The Places; this brand is not in our OpenStreetMap snapshot.';

export function coverageOsmMissingQidNote(): string {
  return COVERAGE_BRAND_NOT_IN_OSM_SNAPSHOT;
}

export function coverageOsmBrandNotInSnapshotNote(): string {
  return COVERAGE_BRAND_NOT_IN_OSM_SNAPSHOT;
}

export function coverageOsmNoStorePointsNote(): string {
  return `OpenStreetMap snapshot has no store points for this brand; ${COVERAGE_SHOWING_ALL_THE_PLACES_ONLY}.`;
}

export function verifyStepDemoAllThePlacesOnlySummary(demoOsmNote: string): string {
  return `Demo: All The Places store data only (${demoOsmNote})`;
}

export function verifyStepDualSourceSummary(verified: number): string {
  return `${verified} prospects verified by All The Places and OpenStreetMap`;
}

export function verifyStepSingleSourceSummary(singleSource: number): string {
  return `${singleSource} prospects checked with All The Places store data only (OpenStreetMap unavailable or single-source)`;
}

export const ABSENCE_WARNING_GEO_TILES =
  'Absence uses All The Places geotiles and OpenStreetMap when available';

export function absenceWarningChains(chainCount: number): string {
  return `${ABSENCE_WARNING_GEO_TILES} (${chainCount} chains). Single-source absence is never shown as confirmed.`;
}

export const PROSPECTING_OSM_UNAVAILABLE =
  'OpenStreetMap unavailable; All The Places store data only';

export function catalogUnderCountNote(nationalCount: number): string {
  return `All The Places snapshot may under-count this chain (${nationalCount} US points in our extract). Treat absence as preliminary.`;
}

export function catalogUnderCountNoOsmNote(nationalCount: number): string {
  return `All The Places snapshot may under-count this chain (${nationalCount} US points). Absence is not confirmed without OpenStreetMap.`;
}

export const SHARE_CARD_STORE_CHECK = 'Qloo taste + All The Places store check';
