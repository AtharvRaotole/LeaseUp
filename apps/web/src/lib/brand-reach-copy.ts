import type { BrandReachContact } from '@leaseup/contracts';

export function brandReachPlainLine(reach: BrandReachContact): string {
  if (reach.status === 'verified' && reach.url) {
    return `How to reach them: submit sites on the brand's official page (${reach.url}).`;
  }
  if (reach.searchUrl) {
    return `How to reach them: we have not verified an official page yet. Search the brand site (${reach.searchUrl}).`;
  }
  return 'How to reach them: we have not verified an official page yet.';
}
