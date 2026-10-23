import { chainSizeTierFromStoreCount, type ChainSizeTier } from './chain-size-tier.js';
import { getNationalStoreCount } from './store-geo.js';

export type TierFitContext = {
  tier: ChainSizeTier;
  tierRank: number;
  tierPoolSize: number;
  tasteFitBeyondChainPercentile: number;
};

/**
 * Percentile taste fit within the same chain-size tier (1 best, 99 worst).
 * Never surfaces raw Qloo affinity decimals in UI copy.
 */
export function tasteFitPercentileWithinTier(tierRank: number, tierPoolSize: number): number {
  if (tierPoolSize <= 1) return 50;
  const betterFraction = 1 - (tierRank - 1) / (tierPoolSize - 1);
  return Math.max(1, Math.min(99, Math.round(betterFraction * 100)));
}

export function buildTierFitByEntityId(
  orderedEntityIds: string[]
): Map<string, TierFitContext> {
  const byTier = new Map<ChainSizeTier, string[]>();
  for (const entityId of orderedEntityIds) {
    const tier = chainSizeTierFromStoreCount(getNationalStoreCount(entityId));
    const list = byTier.get(tier) ?? [];
    list.push(entityId);
    byTier.set(tier, list);
  }

  const out = new Map<string, TierFitContext>();
  for (const [tier, ids] of byTier) {
    ids.forEach((entityId, index) => {
      const tierRank = index + 1;
      const tierPoolSize = ids.length;
      out.set(entityId, {
        tier,
        tierRank,
        tierPoolSize,
        tasteFitBeyondChainPercentile: tasteFitPercentileWithinTier(tierRank, tierPoolSize),
      });
    });
  }
  return out;
}
