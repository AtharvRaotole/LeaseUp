import type { ProspectPack } from '@leaseup/contracts';
import type { BacktestResult } from '@leaseup/contracts';
import { presentInTop10Count } from './hit-rate';

/** Plain-English line shown on landing and at the top of every report. */
export const REPORT_PLAIN_SUMMARY =
  'These are brands your neighborhood shoppers love that do not have a store nearby yet.';

export const LANDING_HEADLINE = 'Find the right stores for your empty retail space.';

export const LANDING_PLAIN_SUMMARY =
  'Type in an address. LeaseUp shows which brands people nearby love but can\'t find close by, and helps you pitch them.';

export function tradeAreaLabel(radiusKm: number): string {
  return `${radiusKm} km area`;
}

export function tradeAreaTooltip(radiusKm: number): string {
  return `We look for existing stores within ${radiusKm} km of your pin.`;
}

export function alreadyNearbyStatLabel(backtest: BacktestResult): string {
  return `${presentInTop10Count(backtest)} of 10`;
}

export function alreadyNearbyStatTooltip(radiusKm: number): string {
  return `Of the top 10 taste picks, how many already have a store within ${radiusKm} km. Lower is better for leasing white space.`;
}

export function brandsScoredStatTooltip(): string {
  return 'How many major chains Qloo scored for taste fit at this address.';
}

export function dataConfidenceStatTooltip(): string {
  return 'How sure we are about the address pin and how deep the brand ranking is.';
}

export function localFitTooltip(): string {
  return 'How strongly local shoppers favor this brand compared with other chains we scored.';
}

export function verificationBrokerLabel(verified: ProspectPack['brand']['verified']): string {
  switch (verified) {
    case 'verified (2 sources)':
      return 'Confirmed open';
    case 'verifying...':
      return 'Checking map';
    case 'unverified (1 source)':
      return 'One source only';
    case 'conflict - likely present':
      return 'Likely open';
    case 'conflict':
      return 'Sources disagree';
    case 'unverified':
      return 'Not confirmed';
    default:
      return 'Not confirmed';
  }
}

export function verificationBrokerTooltip(
  verified: ProspectPack['brand']['verified'],
  radiusKm: number,
  osmSnapshotLabel?: string
): string {
  const osmLabel = osmSnapshotLabel ?? 'OpenStreetMap';
  switch (verified) {
    case 'verified (2 sources)':
      return `No matching store in All The Places or ${osmLabel} within ${radiusKm} km.`;
    case 'verifying...':
      return `We are checking ${osmLabel} for a second source.`;
    case 'unverified (1 source)':
      return `Only one database shows a store within ${radiusKm} km. Treat as a lead, not proof of absence.`;
    case 'conflict - likely present':
    case 'conflict':
      return `Our sources disagree about a store within ${radiusKm} km.`;
    case 'unverified':
      return `We could not confirm a store in either source within ${radiusKm} km.`;
    default:
      return `Store check within ${radiusKm} km.`;
  }
}

export function demoChipProofLabel(presentInTop10: number, tiedNote?: string): string {
  const base = `${presentInTop10} of 10 already nearby`;
  return tiedNote ? `${base} (${tiedNote})` : base;
}

export function proofSectionLead(present: number, radiusKm: number): string {
  return `${present} of the top 10 taste picks already have a store within ${radiusKm} km.`;
}

export function rankingModeTooltip(mode: 'qloo' | 'baseline'): string {
  return mode === 'qloo'
    ? 'Ranked by what local shoppers love (Qloo taste data).'
    : 'Same brands, ranked only by national chain size without local taste.';
}

export function tasteHeatMapTooltip(): string {
  return 'Shows where shoppers who love this brand tend to live or shop nearby.';
}

export function movementColumnTooltip(): string {
  return 'How far this brand moved when we add local taste instead of chain size alone.';
}

export function storeNearbyColumnTooltip(radiusKm: number): string {
  return `Whether this brand already has a store within ${radiusKm} km.`;
}

export const REPORT_TOUR_STORAGE_KEY = 'leaseup-report-guided-tour-v1';
