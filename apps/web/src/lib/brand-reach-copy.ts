import type { BrandReachContact } from '@leaseup/contracts';

export function brandReachLinkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return 'Official site';
  }
}

export function brandReachPlainLine(reach: BrandReachContact): string {
  if (reach.status === 'verified' && reach.url) {
    return `How to reach them: submit sites on ${brandReachLinkHostname(reach.url)}.`;
  }
  return 'How to reach them: Search for their real estate contact.';
}
