import type {
  BacktestResult,
  BrandRankingRow,
  MapStorePoint,
  ProspectPack,
} from '@leaseup/contracts';
import type { QlooInsight } from '../providers/qloo';
import type { Location } from '@leaseup/contracts';
import {
  blendWithNationalPrior,
  computeBacktest,
  findStoresNearby,
  mapStoresForTopBrands,
  nearestStoreDistanceKm,
  CHAIN_PRIOR_BLEND_WEIGHT,
} from '@leaseup/fixtures';

export function buildBrandRankings(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number
): BrandRankingRow[] {
  const blended = blendWithNationalPrior(insights);

  return insights.map((insight, index) => {
    const nearby = findStoresNearby(
      insight.entity_id,
      location.latitude,
      location.longitude,
      radiusKm
    );
    const blendedRow = blended.find((row) => row.entity_id === insight.entity_id);

    return {
      entityId: insight.entity_id,
      name: insight.name,
      affinity: insight.query?.affinity ?? 0,
      qlooRank: index + 1,
      blendedRank: blendedRow?.blendedRank ?? index + 1,
      presentInRadius: nearby.length > 0,
      nearestStoreKm: nearby[0]?.distance,
    };
  });
}

export function buildMapStores(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number,
  topN = 10
): MapStorePoint[] {
  const top = insights.slice(0, topN);
  const names: Record<string, string> = {};
  for (const row of top) {
    names[row.entity_id] = row.name;
  }

  return mapStoresForTopBrands(
    top.map((i) => i.entity_id),
    names,
    location.latitude,
    location.longitude,
    radiusKm
  );
}

export function buildDualBacktest(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number
): { raw: BacktestResult; blended: BacktestResult } {
  const rawComputed = computeBacktest(insights, location.latitude, location.longitude, radiusKm);
  const blendedOrder = blendWithNationalPrior(insights);
  const blendedComputed = computeBacktest(
    blendedOrder,
    location.latitude,
    location.longitude,
    radiusKm
  );

  const toResult = (computed: ReturnType<typeof computeBacktest>): BacktestResult => ({
    totalStores: computed.totalStores,
    predictedStores: computed.predictedStores,
    accuracy: computed.accuracy,
    precisionAt10: computed.precisionAt10,
    presentInTop10: computed.presentInTop10,
    auc: computed.auc,
    examples: computed.examples,
  });

  return {
    raw: toResult(rawComputed),
    blended: toResult(blendedComputed),
  };
}

export function enrichProspectsWithNearest(
  prospects: ProspectPack[],
  location: Location
): ProspectPack[] {
  return prospects.map((pack) => ({
    ...pack,
    nearestExistingStoreKm: nearestStoreDistanceKm(
      pack.brand.entityId,
      location.latitude,
      location.longitude
    ),
  }));
}

export function extractQlooSignals(insight: QlooInsight): string[] {
  const signals: string[] = [];
  if (insight.query?.affinity !== undefined) {
    signals.push(`Affinity ${(insight.query.affinity * 100).toFixed(1)}%`);
  }
  if (insight.query?.popularity !== undefined) {
    signals.push(`Popularity ${(insight.query.popularity * 100).toFixed(1)}%`);
  }
  return signals;
}

export function backtestPlainEnglish(backtest: BacktestResult): string {
  const p10 = Math.round(backtest.precisionAt10 * 100);
  const auc = backtest.auc?.toFixed(2) ?? 'n/a';
  return `${p10}% of Qloo's top-10 brands actually have a store within your radius (AUC ${auc} — higher means ranks separate present vs absent brands).`;
}

export { CHAIN_PRIOR_BLEND_WEIGHT };
