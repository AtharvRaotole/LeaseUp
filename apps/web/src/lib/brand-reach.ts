import type { BrandReachContact, ProspectPack } from '@leaseup/contracts';
import { brandRealEstateForEntity } from '@leaseup/fixtures';

/** Resolve brand real-estate link from the prospect payload or the shared fixtures catalog. */
export function brandReachForProspect(prospect: ProspectPack): BrandReachContact | undefined {
  if (prospect.brandReach) return prospect.brandReach;

  const entry = brandRealEstateForEntity(prospect.brand.entityId);
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
