import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { DEMO_OSM_UNRECORDED_NOTE } from '@leaseup/fixtures';

function sourceChecked(sources: string[], needle: string): boolean {
  return sources.some((s) => s.toLowerCase().includes(needle.toLowerCase()));
}

export function absenceVerificationSummary(
  prospect: ProspectPack,
  radiusKm: number,
  results: AnalysisResponse
): string {
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
