export type ChainSizeTier = 'small' | 'mid' | 'big';

const SMALL_MAX = 450;
const MID_MAX = 1800;

/** National ATP store-count tiers for fair taste comparisons. */
export function chainSizeTierFromStoreCount(storeCount: number): ChainSizeTier {
  if (storeCount < SMALL_MAX) return 'small';
  if (storeCount < MID_MAX) return 'mid';
  return 'big';
}

export function isProspectChainTier(tier: ChainSizeTier): boolean {
  return tier === 'small' || tier === 'mid';
}

export function chainSizeTierLabel(tier: ChainSizeTier): string {
  switch (tier) {
    case 'small':
      return 'small chain (<450 stores)';
    case 'mid':
      return 'mid chain (450 to 1800 stores)';
    case 'big':
      return 'big chain (1800+ stores)';
  }
}
