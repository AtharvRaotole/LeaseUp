import type { Location, ProspectPack } from '@leaseup/contracts';

export function verificationShortLabel(verified: ProspectPack['brand']['verified']): string {
  switch (verified) {
    case 'verified (2 sources)':
      return 'Verified';
    case 'verifying...':
      return 'Checking';
    case 'unverified (1 source)':
      return '1 source';
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
  radiusKm: number
): string {
  switch (verified) {
    case 'verified (2 sources)':
      return `Found in All The Places and OpenStreetMap within ${radiusKm} km`;
    case 'verifying...':
      return 'Checking OpenStreetMap for a second source';
    case 'unverified (1 source)':
      return `Found in only one source within ${radiusKm} km`;
    case 'conflict - likely present':
    case 'conflict':
      return `Sources disagree about a store within ${radiusKm} km`;
    case 'unverified':
      return `Found in neither All The Places nor OpenStreetMap within ${radiusKm} km`;
    default:
      return `Store check within ${radiusKm} km`;
  }
}

export function verificationLabel(verified: ProspectPack['brand']['verified']): string {
  switch (verified) {
    case 'verified (2 sources)':
      return 'Verified by 2 sources';
    case 'verifying...':
      return 'Checking OpenStreetMap';
    case 'unverified (1 source)':
      return 'Only 1 source';
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
      return 'Limited ranking depth or weaker backtest fit';
    case 'insufficient':
      return 'Not enough brands scored for this pin';
    default:
      return 'Based on ranking depth and backtest match';
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
