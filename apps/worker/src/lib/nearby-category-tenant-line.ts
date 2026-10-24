import type { NearbyTenant } from '@leaseup/contracts';
import { brandCategoryLabel } from './brand-category';

function formatRadiusKm(radiusKm: number): string {
  const rounded = Math.round(radiusKm * 10) / 10;
  return Number.isInteger(rounded) ? String(Math.round(rounded)) : String(rounded);
}

function categoryPhrase(label: string): string {
  return label.trim().toLowerCase();
}

function tenantsInRadius(nearbyTenants: NearbyTenant[], radiusKm: number): NearbyTenant[] {
  return nearbyTenants.filter((t) => t.distanceKm <= radiusKm);
}

function countSameCategory(
  tenants: NearbyTenant[],
  categoryLabel: string
): number {
  const norm = categoryLabel.trim().toUpperCase();
  let count = 0;
  for (const t of tenants) {
    const cat = brandCategoryLabel(t.entityId);
    if (cat && cat.toUpperCase() === norm) count += 1;
  }
  return count;
}

/** True when at least one nearby tenant has a mapped retail category. */
function hasClassifiableNearbyTenants(tenants: NearbyTenant[]): boolean {
  return tenants.some((t) => Boolean(brandCategoryLabel(t.entityId)));
}

/**
 * Broker reason line from OSM snapshot incumbents and the pitched brand category.
 * Omits when category or nearby tenant data is missing, or tenants cannot be categorized.
 */
export function nearbyCategoryTenantReasonLine(
  categoryLabel: string | undefined,
  nearbyTenants: NearbyTenant[] | undefined,
  radiusKm: number
): string | undefined {
  const category = categoryLabel?.trim();
  if (!category || nearbyTenants === undefined) return undefined;

  const inRadius = tenantsInRadius(nearbyTenants, radiusKm);
  if (inRadius.length > 0 && !hasClassifiableNearbyTenants(inRadius)) {
    return undefined;
  }

  const count = countSameCategory(inRadius, category);
  const phrase = categoryPhrase(category);
  const radiusLabel = formatRadiusKm(radiusKm);

  if (count === 0) {
    return `No other ${phrase} stores within ${radiusLabel} km`;
  }
  const storeWord = count === 1 ? 'store' : 'stores';
  return `${count} ${phrase} ${storeWord} within ${radiusLabel} km`;
}
