import type { AnalysisRequest } from '@leaseup/contracts';

export type CategoryKey = 'all' | 'apparel' | 'food' | 'beauty' | 'fitness' | 'home';

export const CATEGORY_OPTIONS: Array<{ key: CategoryKey; label: string; tags?: string[] }> = [
  { key: 'all', label: 'All' },
  { key: 'apparel', label: 'Apparel', tags: ['apparel'] },
  { key: 'food', label: 'Food and drink', tags: ['food_and_drink'] },
  { key: 'beauty', label: 'Beauty', tags: ['beauty'] },
  { key: 'fitness', label: 'Fitness', tags: ['fitness'] },
  { key: 'home', label: 'Home', tags: ['home'] },
];

export function categoryToTags(key: CategoryKey): string[] | undefined {
  const row = CATEGORY_OPTIONS.find((c) => c.key === key);
  return row?.tags;
}

export function buildReportPath(request: AnalysisRequest, slug = 'run'): string {
  const params = new URLSearchParams();
  params.set('address', request.address);
  params.set('radius', String(request.radius));
  if (request.categoryTags?.length) {
    params.set('category', request.categoryTags.join(','));
  }
  if (request.storefrontSqFt !== undefined) {
    params.set('sqft', String(request.storefrontSqFt));
  }
  const loc = request.confirmedLocation;
  if (loc) {
    params.set('lat', String(loc.latitude));
    params.set('lng', String(loc.longitude));
    if (loc.resolvedAddress) params.set('resolved', loc.resolvedAddress);
    if (loc.neighborhood) params.set('neighborhood', loc.neighborhood);
    if (loc.city) params.set('city', loc.city);
    params.set('pinConfirmed', '1');
  }
  return `/r/${slug}?${params.toString()}`;
}

export function parseReportSearch(params: URLSearchParams): AnalysisRequest | null {
  const address = params.get('address');
  const radius = Number(params.get('radius') || '10');
  if (!address) return null;
  const category = params.get('category');
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const pinConfirmed = params.get('pinConfirmed') === '1';
  const sqft = Number(params.get('sqft') || '2500');
  const confirmedLocation =
    pinConfirmed && Number.isFinite(lat) && Number.isFinite(lng)
      ? {
          address,
          latitude: lat,
          longitude: lng,
          resolvedAddress: params.get('resolved') ?? undefined,
          neighborhood: params.get('neighborhood') ?? undefined,
          city: params.get('city') ?? undefined,
        }
      : undefined;
  return {
    address,
    radius: Number.isFinite(radius) ? radius : 10,
    categoryTags: category ? category.split(',').filter(Boolean) : undefined,
    storefrontSqFt: Number.isFinite(sqft) ? sqft : 2500,
    confirmedLocation,
  };
}

export function categoryKeyFromTags(tags?: string[]): CategoryKey {
  if (!tags?.length) return 'all';
  const hit = CATEGORY_OPTIONS.find(
    (c) => c.tags && c.tags.every((t) => tags.includes(t))
  );
  return hit?.key ?? 'all';
}
