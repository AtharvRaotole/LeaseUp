import type {
  BacktestResult,
  BrandRankingRow,
  MapStorePoint,
  ProspectPack,
} from '@leaseup/contracts';
import type { QlooInsight } from '../providers/qloo';
import type { Location } from '@leaseup/contracts';
import {
  orderInsightsByLogisticBlend,
  computeBacktest,
  orderInsightsByNationalStoreCount,
  getNationalStoreCount,
  adaptiveEvalRadiusKm,
  buildTierFitByEntityId,
  chainSizeTierFromStoreCount,
} from '@leaseup/fixtures';
import type { EvalSiteDensity } from '@leaseup/fixtures';
import type { StoreCatalog } from '../services/store-catalog';
import { displayBrandName } from './brand-display';

function presenceRadiusKm(density: EvalSiteDensity, searchRadiusKm: number): number {
  return adaptiveEvalRadiusKm(density, searchRadiusKm);
}

export async function buildBrandRankings(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number,
  catalog: StoreCatalog,
  density: EvalSiteDensity = 'urban'
): Promise<BrandRankingRow[]> {
  const blended = orderInsightsByLogisticBlend(insights, density);
  const brandIds = new Set(catalog.getBrandIds());
  const tierFit = buildTierFitByEntityId(insights.map((i) => i.entity_id));
  const scoreRadiusKm = presenceRadiusKm(density, radiusKm);

  const baselineOrdered = orderInsightsByNationalStoreCount(insights);
  const baselineRankById = new Map(
    baselineOrdered.map((row, index) => [row.entity_id, index + 1])
  );

  const rows: BrandRankingRow[] = [];
  for (let index = 0; index < insights.length; index++) {
    const insight = insights[index]!;
    if (!brandIds.has(insight.entity_id)) continue;
    const nearby = await catalog.findStoresNearby(
      insight.entity_id,
      location.latitude,
      location.longitude,
      scoreRadiusKm
    );
    const blendedRow = blended.find((row) => row.entity_id === insight.entity_id);
    const tier = tierFit.get(insight.entity_id);

    rows.push({
      entityId: insight.entity_id,
      name: displayBrandName(insight.entity_id, insight.name),
      affinity: insight.query?.affinity ?? 0,
      qlooRank: index + 1,
      blendedRank: blendedRow?.blendedRank ?? index + 1,
      baselineRank: baselineRankById.get(insight.entity_id) ?? index + 1,
      nationalStoreCount: getNationalStoreCount(insight.entity_id),
      chainSizeTier: tier?.tier,
      tasteFitBeyondChainPercentile: tier?.tasteFitBeyondChainPercentile,
      presentInRadius: nearby.length > 0,
      nearestStoreKm: nearby[0]?.distance,
    });
  }
  return rows;
}

export async function buildMapStores(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number,
  catalog: StoreCatalog,
  topN = 10
): Promise<MapStorePoint[]> {
  const top = insights.slice(0, topN);
  const points: MapStorePoint[] = [];

  for (const row of top) {
    const nearby = await catalog.findStoresNearby(
      row.entity_id,
      location.latitude,
      location.longitude,
      radiusKm
    );
    for (const store of nearby.slice(0, 3)) {
      points.push({
        entityId: row.entity_id,
        brandName: displayBrandName(row.entity_id, row.name),
        latitude: store.lat,
        longitude: store.lon,
        distanceKm: store.distance,
      });
    }
  }
  return points;
}

export async function buildDualBacktest(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number,
  catalog: StoreCatalog,
  density: EvalSiteDensity = 'urban'
): Promise<{ raw: BacktestResult; blended: BacktestResult }> {
  const brandIds = new Set(catalog.getBrandIds());
  const scoreRadiusKm = presenceRadiusKm(density, radiusKm);
  const nearbyCache = new Map<string, Array<{ distance: number }>>();
  for (const insight of insights.filter((i) => brandIds.has(i.entity_id))) {
    const rows = await catalog.findStoresNearby(
      insight.entity_id,
      location.latitude,
      location.longitude,
      scoreRadiusKm
    );
    nearbyCache.set(insight.entity_id, rows.map((s) => ({ distance: s.distance })));
  }

  const findFromCache = (brandId: string, _lat: number, _lon: number, _r: number) =>
    nearbyCache.get(brandId) ?? [];

  const raw = computeBacktest(
    insights,
    location.latitude,
    location.longitude,
    scoreRadiusKm,
    findFromCache,
    brandIds
  );

  const blendedOrder = orderInsightsByLogisticBlend(insights, density);
  const blended = computeBacktest(
    blendedOrder,
    location.latitude,
    location.longitude,
    scoreRadiusKm,
    findFromCache,
    brandIds
  );

  return {
    raw: toBacktestResult(raw),
    blended: toBacktestResult(blended),
  };
}

export async function buildBaselineBacktest(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number,
  catalog: StoreCatalog,
  density: EvalSiteDensity = 'urban'
): Promise<BacktestResult> {
  const brandIds = new Set(catalog.getBrandIds());
  const ordered = orderInsightsByNationalStoreCount(insights);
  const scoreRadiusKm = presenceRadiusKm(density, radiusKm);
  const nearbyCache = new Map<string, Array<{ distance: number }>>();
  for (const insight of ordered.filter((i) => brandIds.has(i.entity_id))) {
    const rows = await catalog.findStoresNearby(
      insight.entity_id,
      location.latitude,
      location.longitude,
      scoreRadiusKm
    );
    nearbyCache.set(insight.entity_id, rows.map((s) => ({ distance: s.distance })));
  }

  const findFromCache = (brandId: string) => nearbyCache.get(brandId) ?? [];

  const computed = computeBacktest(
    ordered,
    location.latitude,
    location.longitude,
    scoreRadiusKm,
    (brandId, _lat, _lon, _r) => findFromCache(brandId),
    brandIds
  );

  return toBacktestResult(computed);
}

function toBacktestResult(computed: ReturnType<typeof computeBacktest>): BacktestResult {
  return {
    totalStores: computed.totalStores,
    predictedStores: computed.predictedStores,
    accuracy: computed.accuracy,
    precisionAt10: computed.precisionAt10,
    presentInTop10: computed.presentInTop10,
    auc: computed.auc,
    examples: computed.examples,
  };
}

export function enrichProspectsWithNearest(
  prospects: ProspectPack[],
  location: Location,
  catalog: StoreCatalog
): Promise<ProspectPack[]> {
  return Promise.all(
    prospects.map(async (pack) => {
      const nearby = await catalog.findStoresNearby(
        pack.brand.entityId,
        location.latitude,
        location.longitude,
        50
      );
      return {
        ...pack,
        nearestExistingStoreKm: nearby[0]?.distance,
      };
    })
  );
}

export function extractQlooSignals(insight: QlooInsight): string[] {
  const signals: string[] = [];
  if (insight.query?.affinity_rank !== undefined) {
    signals.push(`affinity rank ${insight.query.affinity_rank}`);
  }
  if (insight.query?.affinity !== undefined) {
    signals.push(`tier taste fit (not raw affinity)`);
  }
  return signals;
}

export { chainSizeTierFromStoreCount };
