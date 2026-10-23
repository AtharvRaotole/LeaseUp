import type { AnalysisResponse } from '@leaseup/contracts';
import { brandCategoryLabel } from './brand-category';

export type CoTenancyMixRow = {
  category: string;
  nearbyCount: number;
  prospectCount: number;
};

export function buildCoTenancyMix(results: AnalysisResponse): CoTenancyMixRow[] {
  const nearby = new Map<string, number>();
  for (const row of results.rankings ?? []) {
    if (!row.presentInRadius) continue;
    const cat = brandCategoryLabel(row.entityId) ?? 'Other';
    nearby.set(cat, (nearby.get(cat) ?? 0) + 1);
  }

  const prospects = new Map<string, number>();
  for (const p of results.prospects) {
    const cat =
      p.tenantMixScore?.categoryFit ?? brandCategoryLabel(p.brand.entityId) ?? 'Other';
    prospects.set(cat, (prospects.get(cat) ?? 0) + 1);
  }

  const categories = new Set([...nearby.keys(), ...prospects.keys()]);
  return [...categories]
    .map((category) => ({
      category,
      nearbyCount: nearby.get(category) ?? 0,
      prospectCount: prospects.get(category) ?? 0,
    }))
    .sort((a, b) => b.prospectCount + b.nearbyCount - (a.prospectCount + a.nearbyCount));
}

export function coTenantBrandNames(results: AnalysisResponse, limit = 5): string[] {
  const names: string[] = [];
  for (const row of results.rankings ?? []) {
    if (!row.presentInRadius) continue;
    if (names.includes(row.name)) continue;
    names.push(row.name);
    if (names.length >= limit) break;
  }
  return names;
}
