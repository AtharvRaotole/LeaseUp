import { BRAND_DISPLAY_BY_ID, BRAND_DISPLAY_BY_QLOO_NAME } from '../data/brand-display-map';

export function displayBrandName(entityId: string, qlooName: string): string {
  return (
    BRAND_DISPLAY_BY_ID[entityId.toUpperCase()] ??
    BRAND_DISPLAY_BY_QLOO_NAME[qlooName] ??
    qlooName
  );
}
