import type { ProspectPack } from '@leaseup/contracts';

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
