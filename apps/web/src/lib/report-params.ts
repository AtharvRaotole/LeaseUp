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
  return `/r/${slug}?${params.toString()}`;
}

export function parseReportSearch(params: URLSearchParams): AnalysisRequest | null {
  const address = params.get('address');
  const radius = Number(params.get('radius') || '10');
  if (!address) return null;
  const category = params.get('category');
  return {
    address,
    radius: Number.isFinite(radius) ? radius : 10,
    categoryTags: category ? category.split(',').filter(Boolean) : undefined,
  };
}

export function categoryKeyFromTags(tags?: string[]): CategoryKey {
  if (!tags?.length) return 'all';
  const hit = CATEGORY_OPTIONS.find(
    (c) => c.tags && c.tags.every((t) => tags.includes(t))
  );
  return hit?.key ?? 'all';
}
