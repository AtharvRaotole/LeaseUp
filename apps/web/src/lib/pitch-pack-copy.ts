import type { PitchPackSnapshot, ProspectPack } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';

export function pitchExecutiveSummaryLines(snapshot: PitchPackSnapshot): string[] {
  const count = snapshot.prospects.length;
  const strongest = snapshot.prospects
    .slice(0, 3)
    .map((p) => displayBrandName(p.prospect.brand.entityId, p.prospect.brand.name));
  const strongestLine =
    strongest.length > 0 ? `Strongest: ${strongest.join(', ')}.` : 'No prospects in this snapshot.';
  return [
    `${count} brand${count === 1 ? '' : 's'} whose fans already shop here and have no store within ${snapshot.radiusKm} km.`,
    strongestLine,
    `Verified against All The Places and ${snapshot.osmSnapshotLabel ?? 'OpenStreetMap'} at snapshot time.`,
  ];
}

export function pitchProspectFact(
  prospect: ProspectPack,
  radiusKm: number,
  searchRadiusKm = 25
): string {
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const km = prospect.nearestExistingStoreKm;
  if (km !== undefined) {
    if (km <= searchRadiusKm) {
      return `Nearest ${name} is ${km.toFixed(1)} km from this pin (closest gap in the trade area).`;
    }
    return `Nearest ${name} is ${km.toFixed(1)} km away, outside the ${searchRadiusKm} km trade-area check.`;
  }
  return `No ${name} store within ${radiusKm} km of this pin in our store data.`;
}

/** Skip stored why lines that only repeat Qloo rank wording already shown above. */
export function shouldShowStoredWhyLine(whyLine: string): boolean {
  const lower = whyLine.toLowerCase();
  if (lower.includes('qloo #') || lower.includes('qloo rank')) return false;
  if (/\btop \d+%\b/.test(lower) && lower.includes('rank')) return false;
  return whyLine.trim().length > 0;
}
