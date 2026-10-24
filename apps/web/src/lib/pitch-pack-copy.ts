import type { AnalysisResponse, PitchPackSnapshot, ProspectPack } from '@leaseup/contracts';
import { isDemoPitchId } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { formatUserFacingDate } from './format-date';
import { pitchBrandTasteFitSentence } from '@leaseup/fixtures';
import { absenceRadiusKm, pitchPackAbsenceRadiusKm } from './absence-radius';

export function pitchBriefKindLabel(snapshot: PitchPackSnapshot): string {
  return isDemoPitchId(snapshot.id) ? 'Sample leasing brief' : 'Leasing brief';
}

export function pitchDateMetaLine(snapshot: PitchPackSnapshot): string {
  const radius = `${snapshot.radiusKm} km trade area`;
  if (isDemoPitchId(snapshot.id)) {
    const snapDate = formatUserFacingDate(snapshot.analysisTimestamp);
    return `Data snapshot of ${snapDate} · ${radius}`;
  }
  return `Prepared ${formatUserFacingDate(snapshot.createdAt)} · ${radius}`;
}

export function pitchPropertyHeadline(snapshot: PitchPackSnapshot): string {
  return (
    snapshot.neighborhood ??
    snapshot.location.neighborhood ??
    snapshot.location.city ??
    'This storefront'
  );
}

export function pitchTradeAreaFacts(snapshot: PitchPackSnapshot): string[] {
  const lines = [
    `${snapshot.radiusKm} km search radius around the pin`,
    `Address on file: ${snapshot.address}`,
  ];
  if (snapshot.location.city) {
    lines.push(`City: ${snapshot.location.city}`);
  }
  const when = formatUserFacingDate(snapshot.analysisTimestamp);
  lines.push(`Taste and store data from ${when}`);
  return lines;
}

export function pitchNearestStoreBriefLine(prospect: ProspectPack): string | null {
  const km = prospect.nearestExistingStoreKm;
  if (km === undefined) return null;
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  return `Nearest ${name} is ${km.toFixed(1)} km away (All The Places store data).`;
}

export function isPitchRankSummaryLine(line: string): boolean {
  const trimmed = line.trim();
  if (/^#\d+ of \d+ brands we scored/i.test(trimmed)) return true;
  if (/\btop \d+% for local shopper taste/i.test(trimmed)) return true;
  return false;
}

export function isStoredAbsencePitchLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (lower.includes('atp catalog')) return true;
  if (/no .+ store within \d+ km/i.test(lower)) return true;
  return false;
}

export function pitchBrandTasteBriefLine(prospect: ProspectPack): string | undefined {
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  return pitchBrandTasteFitSentence(name, prospect.whyBrandTaste);
}

export function pitchBrandFitLines(
  prospect: ProspectPack,
  _snapshot: PitchPackSnapshot
): string[] {
  const lines: string[] = [];
  const tasteLine = pitchBrandTasteBriefLine(prospect);
  if (tasteLine) lines.push(tasteLine);
  const nearest = pitchNearestStoreBriefLine(prospect);
  if (nearest) lines.push(nearest);
  for (const reason of prospect.reasons) {
    if (shouldShowStoredWhyLine(reason)) {
      lines.push(reason.trim());
    }
  }
  return lines;
}

export function pitchListOrderLabel(listIndex: number): string {
  return `Your list #${listIndex + 1}`;
}

export function pitchNextStepLine(brandName: string): string {
  return `Next step: share this brief with ${brandName} real estate and schedule a site walk at the pin.`;
}

export function pitchExecutiveSummaryLines(snapshot: PitchPackSnapshot): string[] {
  const count = snapshot.prospects.length;
  const strongest = snapshot.prospects
    .slice(0, 3)
    .map((p) => displayBrandName(p.prospect.brand.entityId, p.prospect.brand.name));
  const strongestLine =
    strongest.length > 0 ? `Strongest: ${strongest.join(', ')}.` : 'No prospects in this snapshot.';
  return [
    `${count} brand${count === 1 ? '' : 's'} whose fans already shop here and have no store within ${pitchPackAbsenceRadiusKm(snapshot)} km.`,
    strongestLine,
  ];
}

export function pitchProspectFact(
  prospect: ProspectPack,
  searchRadiusKm: number,
  results?: AnalysisResponse
): string {
  const absenceKm = results ? absenceRadiusKm(results, searchRadiusKm) : searchRadiusKm;
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const km = prospect.nearestExistingStoreKm;
  if (km !== undefined) {
    if (km > absenceKm) {
      return `Nearest ${name} is ${km.toFixed(1)} km from this pin (no store within ${absenceKm} km).`;
    }
    return `Nearest ${name} is ${km.toFixed(1)} km from this pin.`;
  }
  return `No ${name} store within ${absenceKm} km of this pin in our store data.`;
}

export function pitchProspectFactFromSnapshot(
  prospect: ProspectPack,
  snapshot: PitchPackSnapshot
): string {
  const absenceKm = pitchPackAbsenceRadiusKm(snapshot);
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const km = prospect.nearestExistingStoreKm;
  if (km !== undefined) {
    if (km > absenceKm) {
      return `Nearest ${name} is ${km.toFixed(1)} km from this pin (no store within ${absenceKm} km).`;
    }
    return `Nearest ${name} is ${km.toFixed(1)} km from this pin.`;
  }
  return `No ${name} store within ${absenceKm} km of this pin in our store data.`;
}

/** Matches worker pitch why lines and other nearest-store distance copy. */
export function isNearestStoreDistanceLine(line: string): boolean {
  const trimmed = line.trim();
  if (!/^nearest /i.test(trimmed)) return false;
  return /\d+\.\d+ km/i.test(trimmed);
}

/** Skip stored why lines that only repeat Qloo rank wording already shown above. */
export function shouldShowStoredWhyLine(whyLine: string): boolean {
  const lower = whyLine.toLowerCase();
  if (lower.includes('qloo #') || lower.includes('qloo rank')) return false;
  if (lower.includes('leaseup rank')) return false;
  if (lower.includes('prospect ordering')) return false;
  if (lower.includes('taste-aware blend')) return false;
  if (/\btop \d+%\b/.test(lower) && lower.includes('rank')) return false;
  if (isNearestStoreDistanceLine(whyLine)) return false;
  if (isPitchRankSummaryLine(whyLine)) return false;
  if (isStoredAbsencePitchLine(whyLine)) return false;
  if (/^audience:\s*/i.test(whyLine.trim())) return false;
  if (/^tag:\s*/i.test(whyLine.trim())) return false;
  return whyLine.trim().length > 0;
}
