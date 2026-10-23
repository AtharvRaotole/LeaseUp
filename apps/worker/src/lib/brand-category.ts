import { BRAND_CATEGORY_BY_ID } from '../data/brand-category-map';

export function brandCategoryLabel(entityId: string): string | undefined {
  return BRAND_CATEGORY_BY_ID[entityId.toUpperCase()];
}
