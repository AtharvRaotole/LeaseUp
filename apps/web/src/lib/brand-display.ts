import { BRAND_DISPLAY_BY_ID, BRAND_DISPLAY_BY_QLOO_NAME } from '../data/brand-display-map';

const LEGAL_SUFFIX =
  /\s*,?\s*(Inc\.?|LLC|L\.L\.C\.|Co\.?|Corp\.?|Corporation|Company|Ltd\.?)$/i;

/** Single display name for Qloo/legal strings across the report UI. */
export function displayBrandName(entityId: string, qlooName: string): string {
  const mapped =
    BRAND_DISPLAY_BY_ID[entityId.toUpperCase()] ??
    BRAND_DISPLAY_BY_QLOO_NAME[qlooName] ??
    BRAND_DISPLAY_BY_QLOO_NAME[qlooName.trim()] ??
    undefined;
  if (mapped) return mapped;
  const stripped = qlooName.replace(LEGAL_SUFFIX, '').trim();
  return stripped.length >= 2 ? stripped : qlooName;
}
