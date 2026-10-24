import type { ProspectPack } from '@leaseup/contracts';
import { brandCategoryLabel } from './brand-category';

/** Retail category label for the brand (taxonomy), not a computed tenant-mix gap at the pin. */
export function prospectBrandCategoryLabel(prospect: ProspectPack): string | undefined {
  const raw =
    prospect.tenantMixScore?.categoryFit?.trim() ||
    brandCategoryLabel(prospect.brand.entityId);
  const label = raw?.replace(/\.$/, '').trim();
  return label || undefined;
}
