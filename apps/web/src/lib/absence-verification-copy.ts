import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { absenceRadiusKm } from './absence-radius';

const DEMO_OSM_UNRECORDED_NOTE = 'OSM check not recorded for demo';

function sourceChecked(sources: string[], needle: string): boolean {
  return sources.some((s) => s.toLowerCase().includes(needle.toLowerCase()));
}

export function absenceVerificationSummary(
  prospect: ProspectPack,
  searchRadiusKm: number,
  results: AnalysisResponse
): string {
  const radiusKm = absenceRadiusKm(results, searchRadiusKm);
  const osmLabel = results.osmSnapshotLabel ?? 'OpenStreetMap snapshot';
  const sources = prospect.brand.verificationSources ?? [];
  const atpChecked = sourceChecked(sources, 'all the places');
  const osmChecked =
    sourceChecked(sources, 'openstreetmap') && !sources.some((s) => s.includes('store found'));
  const demoOsmSkipped = prospect.coverageNote?.includes(DEMO_OSM_UNRECORDED_NOTE);

  if (prospect.brand.verified === 'verified (2 sources)' && atpChecked && osmChecked) {
    return `No store within ${radiusKm} km in All The Places or ${osmLabel}.`;
  }

  if (prospect.brand.verified === 'unverified (1 source)' && atpChecked && !osmChecked) {
    if (demoOsmSkipped) {
      return `No store within ${radiusKm} km in All The Places. ${DEMO_OSM_UNRECORDED_NOTE}.`;
    }
    return `No store within ${radiusKm} km in All The Places. Not yet checked in ${osmLabel}.`;
  }

  if (prospect.brand.verified === 'verifying...') {
    return `No store within ${radiusKm} km in All The Places. Checking ${osmLabel} for a second source.`;
  }

  if (prospect.brand.verified === 'conflict - likely present' || prospect.brand.verified === 'conflict') {
    return `Sources disagree about a ${prospect.brand.name} store within ${radiusKm} km.`;
  }

  const checked = [
    atpChecked ? 'All The Places' : null,
    osmChecked ? osmLabel : null,
  ].filter(Boolean);

  if (checked.length > 0) {
    return `No store within ${radiusKm} km per ${checked.join(' and ')}.`;
  }

  return `No store within ${radiusKm} km in our store datasets.`;
}

/**
 * One plain line for the Why card: what was checked, the result and the store data date together, so the
 * card never shows a separate "Checked against ... as of" line next to a "Not yet checked" line.
 */
export function whyCardStoreCheckLine(
  prospect: ProspectPack,
  searchRadiusKm: number,
  results: AnalysisResponse,
  storeDataDateLabel: string
): string {
  const radiusKm = absenceRadiusKm(results, searchRadiusKm);
  const asOf = `(store data as of ${storeDataDateLabel})`;
  const sources = prospect.brand.verificationSources ?? [];
  const atpChecked = sourceChecked(sources, 'all the places');
  const osmChecked =
    sourceChecked(sources, 'openstreetmap') && !sources.some((s) => s.includes('store found'));
  const demoOsmSkipped = prospect.coverageNote?.includes(DEMO_OSM_UNRECORDED_NOTE);

  if (prospect.brand.verified === 'verified (2 sources)' && atpChecked && osmChecked) {
    return `No store within ${radiusKm} km in All The Places or OpenStreetMap ${asOf}.`;
  }

  if (prospect.brand.verified === 'unverified (1 source)' && atpChecked && !osmChecked) {
    const osmNote = demoOsmSkipped
      ? `${DEMO_OSM_UNRECORDED_NOTE}.`
      : 'OpenStreetMap not checked yet.';
    return `No store within ${radiusKm} km in All The Places ${asOf}. ${osmNote}`;
  }

  if (prospect.brand.verified === 'verifying...') {
    return `No store within ${radiusKm} km in All The Places ${asOf}. Checking OpenStreetMap for a second source.`;
  }

  if (prospect.brand.verified === 'conflict - likely present' || prospect.brand.verified === 'conflict') {
    return `Sources disagree about a ${prospect.brand.name} store within ${radiusKm} km ${asOf}.`;
  }

  const checked = [atpChecked ? 'All The Places' : null, osmChecked ? 'OpenStreetMap' : null].filter(
    Boolean
  );
  if (checked.length > 0) {
    return `No store within ${radiusKm} km per ${checked.join(' and ')} ${asOf}.`;
  }
  return `No store within ${radiusKm} km in our store datasets ${asOf}.`;
}
