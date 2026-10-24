import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import {
  brokerNoStoreWithinRadiusDualSource,
  brokerNoStoreWithinRadiusDualSourceShort,
  brokerNoStoreWithinRadiusSingleSource,
  brokerNoStoreWithinRadiusSingleSourceShort,
} from '@leaseup/fixtures';
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
  const sources = prospect.brand.verificationSources ?? [];
  const atpChecked = sourceChecked(sources, 'all the places');
  const osmChecked =
    sourceChecked(sources, 'openstreetmap') && !sources.some((s) => s.includes('store found'));
  const demoOsmSkipped = prospect.coverageNote?.includes(DEMO_OSM_UNRECORDED_NOTE);

  if (prospect.brand.verified === 'verified (2 sources)' && atpChecked && osmChecked) {
    return brokerNoStoreWithinRadiusDualSourceShort(radiusKm);
  }

  if (prospect.brand.verified === 'unverified (1 source)' && atpChecked && !osmChecked) {
    if (demoOsmSkipped) {
      return `${brokerNoStoreWithinRadiusSingleSourceShort(radiusKm)} ${DEMO_OSM_UNRECORDED_NOTE}.`;
    }
    return brokerNoStoreWithinRadiusSingleSourceShort(radiusKm);
  }

  if (prospect.brand.verified === 'verifying...') {
    return `No store within ${radiusKm} km in our store data. Checking for a second source.`;
  }

  if (prospect.brand.verified === 'conflict - likely present') {
    return `Store data disagrees; likely has a nearby ${prospect.brand.name} store within ${radiusKm} km.`;
  }
  if (prospect.brand.verified === 'conflict') {
    return `Sources disagree about a ${prospect.brand.name} store within ${radiusKm} km.`;
  }

  const checked = [
    atpChecked ? 'All The Places' : null,
    osmChecked ? 'OpenStreetMap' : null,
  ].filter(Boolean);

  if (checked.length > 0) {
    return `No store within ${radiusKm} km per ${checked.join(' and ')}.`;
  }

  return `No store within ${radiusKm} km in our store data.`;
}

/**
 * One plain line for the Why card: absence result and store data date together.
 */
export function whyCardStoreCheckLine(
  prospect: ProspectPack,
  searchRadiusKm: number,
  results: AnalysisResponse,
  storeDataDateLabel: string
): string {
  const radiusKm = absenceRadiusKm(results, searchRadiusKm);
  const sources = prospect.brand.verificationSources ?? [];
  const atpChecked = sourceChecked(sources, 'all the places');
  const osmChecked =
    sourceChecked(sources, 'openstreetmap') && !sources.some((s) => s.includes('store found'));
  const demoOsmSkipped = prospect.coverageNote?.includes(DEMO_OSM_UNRECORDED_NOTE);

  if (prospect.brand.verified === 'verified (2 sources)' && atpChecked && osmChecked) {
    return brokerNoStoreWithinRadiusDualSource(radiusKm, storeDataDateLabel);
  }

  if (prospect.brand.verified === 'unverified (1 source)' && atpChecked && !osmChecked) {
    if (demoOsmSkipped) {
      return `${brokerNoStoreWithinRadiusSingleSource(radiusKm, storeDataDateLabel)} ${DEMO_OSM_UNRECORDED_NOTE}.`;
    }
    return brokerNoStoreWithinRadiusSingleSource(radiusKm, storeDataDateLabel);
  }

  if (prospect.brand.verified === 'verifying...') {
    return `No store within ${radiusKm} km in our store data as of ${storeDataDateLabel}. Checking for a second source.`;
  }

  if (prospect.brand.verified === 'conflict - likely present') {
    return `Store data disagrees; likely has a nearby ${prospect.brand.name} store within ${radiusKm} km (store data as of ${storeDataDateLabel}).`;
  }
  if (prospect.brand.verified === 'conflict') {
    return `Sources disagree about a ${prospect.brand.name} store within ${radiusKm} km (store data as of ${storeDataDateLabel}).`;
  }

  const checked = [atpChecked ? 'our store data' : null, osmChecked ? 'OpenStreetMap' : null].filter(
    Boolean
  );
  if (checked.length > 0) {
    return `No store within ${radiusKm} km per ${checked.join(' and ')} (as of ${storeDataDateLabel}).`;
  }
  return `No store within ${radiusKm} km in our store data as of ${storeDataDateLabel}.`;
}
