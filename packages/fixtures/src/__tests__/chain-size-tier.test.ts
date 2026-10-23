import { describe, expect, it } from 'vitest';
import {
  chainSizeTierFromStoreCount,
  isProspectChainTier,
} from '../chain-size-tier.js';

describe('chainSizeTierFromStoreCount', () => {
  it('assigns small, mid, and big tiers', () => {
    expect(chainSizeTierFromStoreCount(100)).toBe('small');
    expect(chainSizeTierFromStoreCount(449)).toBe('small');
    expect(chainSizeTierFromStoreCount(450)).toBe('mid');
    expect(chainSizeTierFromStoreCount(1799)).toBe('mid');
    expect(chainSizeTierFromStoreCount(1800)).toBe('big');
  });

  it('limits default prospects to small and mid tiers', () => {
    expect(isProspectChainTier('small')).toBe(true);
    expect(isProspectChainTier('mid')).toBe(true);
    expect(isProspectChainTier('big')).toBe(false);
  });
});
