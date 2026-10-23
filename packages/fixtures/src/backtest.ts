import { findStoresNearby, getStoreBrandIdSet } from './store-geo.js';

export interface BacktestExample {
  name: string;
  distance: number;
  rank: number;
  predicted: boolean;
}

export interface ComputedBacktest {
  totalStores: number;
  predictedStores: number;
  accuracy: number;
  precisionAt10: number;
  presentInTop10: number;
  auc: number;
  examples: BacktestExample[];
}

export { getStoreBrandIds, getStoreBrandIdSet } from './store-geo.js';

export function filterInsightsToStoreBrands<T extends { entity_id: string }>(insights: T[]): T[] {
  const ids = getStoreBrandIdSet();
  return insights.filter((i) => ids.has(i.entity_id));
}

/**
 * Pairwise AUC: fraction of (present, absent) pairs where present ranks higher.
 * Only considers brands returned in `insights` (after store-brand filter).
 */
export function calculateAUC(
  insights: Array<{ entity_id: string }>,
  presentBrands: Set<string>
): number {
  const positives = insights.filter((i) => presentBrands.has(i.entity_id));
  const negatives = insights.filter((i) => !presentBrands.has(i.entity_id));

  if (positives.length === 0 || negatives.length === 0) {
    return 0;
  }

  let sum = 0;
  for (let pi = 0; pi < positives.length; pi++) {
    const posRank = insights.indexOf(positives[pi]!);
    for (let ni = 0; ni < negatives.length; ni++) {
      const negRank = insights.indexOf(negatives[ni]!);
      if (posRank < negRank) {
        sum += 1;
      } else if (posRank === negRank) {
        sum += 0.5;
      }
    }
  }

  return sum / (positives.length * negatives.length);
}

/**
 * Backtest Qloo ranking against All The Places store presence within radius.
 * Only scores brands that exist in the ATP store dataset.
 */
export type FindStoresNearbyFn = (
  brandId: string,
  lat: number,
  lon: number,
  radiusKm: number
) => Array<{ distance: number }>;

export function computeBacktest(
  insights: Array<{ entity_id: string; name: string }>,
  lat: number,
  lon: number,
  radiusKm: number,
  findNearby: FindStoresNearbyFn = findStoresNearby,
  brandIdSet: Set<string> = getStoreBrandIdSet()
): ComputedBacktest {
  const ranked = insights.filter((i) => brandIdSet.has(i.entity_id));
  const presentBrands = new Set<string>();
  const examples: BacktestExample[] = [];

  for (let index = 0; index < ranked.length; index++) {
    const insight = ranked[index]!;
    const rank = index + 1;
    const nearby = findNearby(insight.entity_id, lat, lon, radiusKm);

    if (nearby.length > 0) {
      presentBrands.add(insight.entity_id);
      if (examples.length < 7 && rank <= 10) {
        examples.push({
          name: insight.name,
          distance: nearby[0]!.distance,
          rank,
          predicted: true,
        });
      }
    }
  }

  const top10 = ranked.slice(0, 10);
  const presentInTop10 = top10.filter((b) => presentBrands.has(b.entity_id)).length;
  const precisionAt10 = presentInTop10 / 10;
  const auc = calculateAUC(ranked, presentBrands);

  return {
    totalStores: presentBrands.size,
    predictedStores: presentBrands.size,
    accuracy: presentBrands.size > 0 ? presentInTop10 / Math.min(10, presentBrands.size) : 0,
    precisionAt10,
    presentInTop10,
    auc,
    examples,
  };
}
