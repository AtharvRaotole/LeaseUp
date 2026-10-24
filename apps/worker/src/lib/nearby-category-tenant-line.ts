import type { NearbyTenant } from '@leaseup/contracts';
import { brandCategoryLabel } from './brand-category';

/** Max tracked chains returned from the OSM snapshot list (see listNearbyTenants). */
export const NEARBY_TENANT_LIST_CAP = 24;

const BROAD_CATEGORY_LABELS = new Set(['RETAIL']);

function formatRadiusKm(radiusKm: number): string {
  const rounded = Math.round(radiusKm * 10) / 10;
  return Number.isInteger(rounded) ? String(Math.round(rounded)) : String(rounded);
}

function categoryPhrase(label: string): string {
  return label.trim().toLowerCase();
}

export function isBroadNearbyCategoryLabel(categoryLabel: string): boolean {
  return BROAD_CATEGORY_LABELS.has(categoryLabel.trim().toUpperCase());
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

function trackedChainsLine(
  phrase: string,
  count: number,
  radiusLabel: string,
  atLeast: boolean
): string {
  const prefix = atLeast ? 'At least ' : '';
  if (count === 0) {
    return `No other tracked ${phrase} chains within ${radiusLabel} km`;
  }
  const chainWord = count === 1 ? 'chain' : 'chains';
  return `${prefix}${count} tracked ${phrase} ${chainWord} within ${radiusLabel} km`;
}

/**
 * Broker reason line from OSM snapshot incumbents and the pitched brand category.
 * Counts only tracked chains we can categorize; omits on missing data or broad categories.
 */
export function nearbyCategoryTenantReasonLine(
  categoryLabel: string | undefined,
  nearbyTenants: NearbyTenant[] | undefined,
  radiusKm: number,
  listCapped = false
): string | undefined {
  const category = categoryLabel?.trim();
  if (!category || nearbyTenants === undefined || isBroadNearbyCategoryLabel(category)) {
    return undefined;
  }

  const inRadius = tenantsInRadius(nearbyTenants, radiusKm);
  if (inRadius.length === 0) {
    return undefined;
  }
  if (!hasClassifiableNearbyTenants(inRadius)) {
    return undefined;
  }

  const count = countSameCategory(inRadius, category);
  const phrase = categoryPhrase(category);
  const radiusLabel = formatRadiusKm(radiusKm);
  const cappedInArea =
    listCapped && nearbyTenants.length >= NEARBY_TENANT_LIST_CAP && inRadius.length > 0;

  if (cappedInArea) {
    if (count === 0) return undefined;
    return trackedChainsLine(phrase, count, radiusLabel, true);
  }

  return trackedChainsLine(phrase, count, radiusLabel, false);
}
