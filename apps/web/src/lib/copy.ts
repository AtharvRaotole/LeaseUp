import type { AnalysisResponse, Location, PitchPackSnapshot, ProspectPack } from '@leaseup/contracts';
import { DEMO_OSM_UNRECORDED_NOTE } from '@leaseup/fixtures';

/** Plain label for pitch packs: how many store datasets we checked for this brand. */
export function pitchPackVerificationSummary(
  snapshot: Pick<PitchPackSnapshot, 'prospects'>
): string {
  let twoSource = 0;
  let oneSource = 0;
  let checking = 0;
  for (const row of snapshot.prospects) {
    const v = row.prospect.brand.verified;
    if (v === 'verified (2 sources)') twoSource += 1;
    else if (v === 'unverified (1 source)' || v === 'unverified') oneSource += 1;
    else if (v === 'verifying...') checking += 1;
  }
  const parts: string[] = [];
  if (twoSource > 0) {
    parts.push(
      `${twoSource} brand${twoSource === 1 ? '' : 's'} checked in All The Places and OpenStreetMap`
    );
  }
  if (oneSource > 0) {
    parts.push(`${oneSource} brand${oneSource === 1 ? '' : 's'} checked in one source only`);
  }
  if (checking > 0) {
    parts.push(`${checking} still waiting on a second source`);
  }
  if (parts.length === 0) {
    return 'Store checks vary by brand on this list.';
  }
  return parts.join('; ') + '.';
}

export function pitchCheckedSourcesLabel(prospect: ProspectPack): string {
  const sources = prospect.brand.verificationSources ?? [];
  const atp = sources.some((s) => /all the places/i.test(s));
  const osm = sources.some(
    (s) => /openstreetmap/i.test(s) && !/store found/i.test(s)
  );
  const checked = (atp ? 1 : 0) + (osm ? 1 : 0);
  if (prospect.brand.verified === 'verified (2 sources)' || checked >= 2) {
    return 'Checked in 2 sources';
  }
  if (prospect.brand.verified === 'unverified (1 source)' || checked === 1) {
    return 'Checked in 1 source';
  }
  if (prospect.brand.verified === 'verifying...') {
    return 'Checking second source';
  }
  if (checked === 0) {
    return 'Store check in progress';
  }
  return `Checked in ${checked} source${checked === 1 ? '' : 's'}`;
}

export function verificationShortLabel(verified: ProspectPack['brand']['verified']): string {
  switch (verified) {
    case 'verified (2 sources)':
      return 'Verified';
    case 'verifying...':
      return 'Checking OSM';
    case 'unverified (1 source)':
      return 'One source';
    case 'conflict - likely present':
      return 'Likely present';
    case 'conflict':
      return 'Conflict';
    case 'unverified':
      return 'Unverified';
    default:
      return 'Unverified';
  }
}

export function verificationTooltip(
  verified: ProspectPack['brand']['verified'],
  radiusKm: number,
  osmSnapshotLabel?: string,
  verificationSources?: string[]
): string {
  const stub: ProspectPack = {
    brand: {
      entityId: '',
      name: 'Brand',
      affinity: 0,
      affinityRank: 1,
      verified,
      verificationSources,
    },
    outreachDraft: '',
    reasons: [],
  };
  return verificationSourceHelp(stub, radiusKm, osmSnapshotLabel);
}

function sourceChecked(sources: string[], needle: string): boolean {
  return sources.some((s) => s.toLowerCase().includes(needle.toLowerCase()));
}

/** Names the dataset we used and what we have not checked yet (for badges). */
export function verificationSourceHelp(
  prospect: ProspectPack,
  radiusKm: number,
  osmSnapshotLabel?: string,
  results?: AnalysisResponse
): string {
  const osmLabel = results?.osmSnapshotLabel ?? osmSnapshotLabel ?? 'OpenStreetMap';
  const verified = prospect.brand.verified;
  const sources = prospect.brand.verificationSources ?? [];
  const atpChecked = sourceChecked(sources, 'all the places');
  const osmChecked =
    sourceChecked(sources, 'openstreetmap') && !sources.some((s) => s.includes('store found'));
  const demoOsmSkipped = prospect.coverageNote?.includes(DEMO_OSM_UNRECORDED_NOTE);

  if (verified === 'verified (2 sources)') {
    return `We checked All The Places and ${osmLabel} within ${radiusKm} km and did not find a store.`;
  }

  if (verified === 'verifying...') {
    return `All The Places shows no store within ${radiusKm} km. We are still checking ${osmLabel} for a second confirmation.`;
  }

  if (verified === 'unverified (1 source)') {
    if (atpChecked && !osmChecked) {
      if (demoOsmSkipped) {
        return `Checked: All The Places (no store within ${radiusKm} km). Not checked: ${osmLabel} (${DEMO_OSM_UNRECORDED_NOTE}).`;
      }
      return `Checked: All The Places (no store within ${radiusKm} km). Not checked yet: ${osmLabel}.`;
    }
    if (osmChecked && !atpChecked) {
      return `Checked: ${osmLabel} (no store within ${radiusKm} km). Not checked yet: All The Places.`;
    }
    return `Only one store dataset confirmed absence within ${radiusKm} km. We still need a second source before calling it verified.`;
  }

  if (verified === 'conflict - likely present' || verified === 'conflict') {
    return `All The Places and ${osmLabel} disagree about whether ${prospect.brand.name} has a store within ${radiusKm} km.`;
  }

  if (verified === 'unverified') {
    return `We could not confirm absence in All The Places or ${osmLabel} within ${radiusKm} km.`;
  }

  return `Store check within ${radiusKm} km.`;
}

export function verificationLabel(verified: ProspectPack['brand']['verified']): string {
  switch (verified) {
    case 'verified (2 sources)':
      return 'Verified by 2 sources';
    case 'verifying...':
      return 'Checking OpenStreetMap';
    case 'unverified (1 source)':
      return 'One source';
    case 'conflict - likely present':
      return 'Likely present';
    case 'conflict':
      return 'Conflict';
    case 'unverified':
      return 'Unverified';
    default:
      return String(verified);
  }
}

export function dataConfidenceSubtitle(
  level: 'high' | 'medium' | 'low' | 'insufficient',
  location: Location
): string {
  switch (level) {
    case 'high':
      return location.neighborhood ? 'Exact address match' : 'Strong taste signal for this pin';
    case 'medium':
      return 'Matched to street, not building';
    case 'low':
      return 'Limited ranking depth or weaker store-check match';
    case 'insufficient':
      return 'Not enough brands scored for this pin';
    default:
      return 'Based on ranking depth and how well picks match real stores';
  }
}

export function dataConfidenceLabel(
  level: 'high' | 'medium' | 'low' | 'insufficient'
): string {
  switch (level) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    case 'insufficient':
      return 'Low';
    default:
      return level;
  }
}
