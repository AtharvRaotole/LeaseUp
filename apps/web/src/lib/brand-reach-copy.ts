import type { BrandReachContact } from '@leaseup/contracts';

export function brandReachPlainLine(reach: BrandReachContact): string {
  if (reach.status === 'verified' && reach.url) {
    return `How to reach them: submit sites on the brand's official page (${reach.url}).`;
  }
  return 'How to reach them: Search for their real estate contact.';
}
