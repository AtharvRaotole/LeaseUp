import { filterInsightsToStoreBrands } from './backtest.js';
import { findStoresNearby } from './store-geo.js';
import { wickerparkFixture } from './wicker-park.js';

export type LandingTasteRow = {
  rank: number;
  brandName: string;
  affinity: number;
  storeInRadius: boolean;
  nearestStoreKm: number | null;
};

/** Top Qloo-ranked brands at the Wicker Park demo pin (recorded fixture, 10 km). */
export function wickerLandingTasteSnippet(radiusKm = 10, take = 3): LandingTasteRow[] {
  const { insights, location } = wickerparkFixture;
  const ranked = filterInsightsToStoreBrands(insights);
  const rows: LandingTasteRow[] = [];

  for (let i = 0; i < Math.min(take, ranked.length); i++) {
    const insight = ranked[i]!;
    const nearby = findStoresNearby(
      insight.entity_id,
      location.latitude,
      location.longitude,
      radiusKm
    );
    rows.push({
      rank: i + 1,
      brandName: insight.name,
      affinity: insight.affinity ?? insight.affinity_rank ?? 0,
      storeInRadius: nearby.length > 0,
      nearestStoreKm: nearby[0]?.distance ?? null,
    });
  }

  return rows;
}
