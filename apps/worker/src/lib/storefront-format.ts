import type { StorefrontFormat } from '@leaseup/contracts';

export interface StorefrontFormatSpec {
  format: StorefrontFormat;
  minSqFt: number;
  label: string;
}

const BIG_BOX_IDS = new Set(
  [
    '7E9A2E74-1CB5-43E9-8B74-69CA8283BFBD', // IKEA
    'FBCBEB97-74E1-4390-984A-BC7E5EF4F2EA', // Costco
    '796DBCE4-2B75-4171-BF32-44C16EDE63D5', // Sam's Club
    'BFC8D7B1-BDD2-478E-85AB-F4FEE868177A', // Target
    'D72865CB-DDB5-4202-96A4-D0415C0ACBF3', // Walmart
    'CBCFD4C5-3906-4361-B56D-583B1BCB6532', // Home Depot
    'BEF4E5D5-245C-49D5-8D20-7C8A1B3C80F5', // Best Buy
  ].map((id) => id.toUpperCase())
);

const MALL_INLINE_IDS = new Set<string>();

const DEFAULT_STREETFRONT: StorefrontFormatSpec = {
  format: 'streetfront',
  minSqFt: 800,
  label: 'Streetfront retail',
};

const BIG_BOX: StorefrontFormatSpec = {
  format: 'big_box',
  minSqFt: 25_000,
  label: 'Big-box / format store',
};

const MALL_INLINE: StorefrontFormatSpec = {
  format: 'mall_inline',
  minSqFt: 1_200,
  label: 'Mall inline',
};

export function getStorefrontFormatSpec(entityId: string): StorefrontFormatSpec {
  const id = entityId.toUpperCase();
  if (BIG_BOX_IDS.has(id)) return BIG_BOX;
  if (MALL_INLINE_IDS.has(id)) return MALL_INLINE;
  return DEFAULT_STREETFRONT;
}

export function formatFitsStorefront(entityId: string, storefrontSqFt: number): boolean {
  const spec = getStorefrontFormatSpec(entityId);
  return storefrontSqFt >= spec.minSqFt;
}
