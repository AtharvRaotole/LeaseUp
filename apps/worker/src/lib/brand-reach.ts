import type { BrandReachContact } from '@leaseup/contracts';
import { brandRealEstateForEntity } from '@leaseup/fixtures/worker';

export function brandReachForEntity(entityId: string): BrandReachContact | undefined {
  const entry = brandRealEstateForEntity(entityId);
  if (!entry) return undefined;

  if (entry.status === 'verified') {
    return {
      status: 'verified',
      url: entry.url,
      source: entry.source,
    };
  }

  return {
    status: 'not_yet_found',
    searchUrl: entry.searchUrl,
  };
}
