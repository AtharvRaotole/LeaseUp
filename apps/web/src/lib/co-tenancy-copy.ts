import type { AnalysisResponse, NearbyTenant } from '@leaseup/contracts';

/** Plain-language intro for the co-tenancy mix chart. */
export function coTenancyIntroCopy(radiusKm: number): string {
  return `Stores already open near this pin (OpenStreetMap snapshot) and how pitched brands pair with them using Qloo co-affinity. Search radius ${radiusKm} km.`;
}

export function formatNearbyTenantsList(tenants: NearbyTenant[], max = 12): string {
  if (tenants.length === 0) return '';
  const names = tenants.slice(0, max).map((t) => t.name);
  const more = tenants.length > max ? ` and ${tenants.length - max} more` : '';
  return `Nearby tenants: ${names.join(', ')}${more}.`;
}

export function nearbyTenantsFromResults(results: AnalysisResponse): NearbyTenant[] {
  return results.nearbyTenants ?? [];
}
