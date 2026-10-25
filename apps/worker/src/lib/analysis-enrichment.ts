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
  DEMO_LOGISTIC_SITE_CONTEXT,
  defaultLogisticSiteContext,
  computeBacktest,
  orderInsightsByNationalStoreCount,
  getNationalStoreCount,
  adaptiveEvalRadiusKm,
  buildTierFitByEntityId,
  chainSizeTierFromStoreCount,
  matchDemoFixtureId,
  type EvalDensityStratum,
  type EvalSiteDensity,
} from '@leaseup/fixtures/worker';
import type { StoreCatalog } from '../services/store-catalog';
import type { OsmSnapshotCatalog } from '../services/osm-snapshot-catalog';
import { reconcileNearestStoreKm } from './nearest-store-reconcile';
import { displayBrandName } from './brand-display';
import { NearbyPresenceCache } from './nearby-presence-cache';
import { findTasteTwins, type TasteTwinSet } from './taste-twins';
import { orderInsightsByTwinBlend } from './twin-rank';

const twinMemo = new WeakMap<object, { key: string; set: TasteTwinSet | null }>();

/** Taste twins for this run's insights (static panel, no Qloo calls), memoized per insights array. */
export function tasteTwinsForRun(
  location: Pick<Location, 'latitude' | 'longitude'>,
  insights: QlooInsight[] | Array<{ entity_id: string; query?: { affinity?: number } }>
): TasteTwinSet | null {
  const key = `${location.latitude},${location.longitude}`;
  const hit = twinMemo.get(insights);
  if (hit && hit.key === key) return hit.set;
  const set = findTasteTwins(location.latitude, location.longitude, insights);
  twinMemo.set(insights, { key, set });
  return set;
}

export type RankingModel = 'taste_twins' | 'standard';

/**
 * Production order for a site. Live addresses with taste twins use the twin blend; the recorded demo
 * chips and runs without twins keep the standard logistic blend.
 */
export function orderInsightsForSite<
  T extends { entity_id: string; name: string; query?: { affinity?: number } },
>(
  insights: T[],
  location: Pick<Location, 'latitude' | 'longitude' | 'address'>,
  blendSite: Parameters<typeof orderInsightsByLogisticBlend>[1]
): { ordered: Array<T & { qlooRank: number; blendedRank: number }>; model: RankingModel; twins: TasteTwinSet | null } {
  const twins = matchDemoFixtureId(location.address) ? null : tasteTwinsForRun(location, insights);
  if (twins) return { ordered: orderInsightsByTwinBlend(insights, twins), model: 'taste_twins', twins };
  return { ordered: orderInsightsByLogisticBlend(insights, blendSite), model: 'standard', twins: null };
}

function stratumToBlendDensity(densityOrStratum: EvalSiteDensity | EvalDensityStratum): EvalSiteDensity {
  if (densityOrStratum === 'dense_urban') return 'urban';
  return densityOrStratum as EvalSiteDensity;
}

function logisticSiteForBlend(
  location: Location,
  densityOrStratum: EvalSiteDensity | EvalDensityStratum,
  searchRadiusKm: number
) {
  const fixtureId = matchDemoFixtureId(location.address);
  if (fixtureId) return DEMO_LOGISTIC_SITE_CONTEXT[fixtureId];
  const blendDensity = stratumToBlendDensity(densityOrStratum);
  return defaultLogisticSiteContext(blendDensity, searchRadiusKm);
}

/** Store presence radius for rankings and prospect absence (dense areas use a smaller km). */
export function presenceRadiusKm(
  densityOrStratum: EvalSiteDensity | EvalDensityStratum,
  searchRadiusKm: number
): number {
  return adaptiveEvalRadiusKm(densityOrStratum, searchRadiusKm);
}

export async function buildBrandRankings(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number,
  catalog: StoreCatalog,
  densityOrStratum: EvalSiteDensity | EvalDensityStratum = 'urban',
  presence?: NearbyPresenceCache,
  tasteUnavailable = false
): Promise<BrandRankingRow[]> {
  const cache = presence ?? new NearbyPresenceCache(catalog, location);
  const blended = tasteUnavailable
    ? orderInsightsByNationalStoreCount(insights).map((row, index) => ({
        ...row,
        qlooRank: index + 1,
        blendedRank: index + 1,
      }))
    : orderInsightsForSite(insights, location, logisticSiteForBlend(location, densityOrStratum, radiusKm)).ordered;
  const brandIds = new Set(catalog.getBrandIds());
  const tierFit = buildTierFitByEntityId(insights.map((i) => i.entity_id));
  const scoreRadiusKm = presenceRadiusKm(densityOrStratum, radiusKm);

  const baselineOrdered = orderInsightsByNationalStoreCount(insights);
  const baselineRankById = new Map(
    baselineOrdered.map((row, index) => [row.entity_id, index + 1])
  );

  const rows: BrandRankingRow[] = [];
  for (let index = 0; index < insights.length; index++) {
    const insight = insights[index]!;
    if (!brandIds.has(insight.entity_id)) continue;
    const nearby = await cache.storesNearby(insight.entity_id, scoreRadiusKm);
    const blendedRow = blended.find((row) => row.entity_id === insight.entity_id);
    const tier = tierFit.get(insight.entity_id);

    rows.push({
      entityId: insight.entity_id,
      name: displayBrandName(insight.entity_id, insight.name),
      affinity: tasteUnavailable ? 0 : (insight.query?.affinity ?? 0),
      qlooRank: tasteUnavailable
        ? (blended.find((row) => row.entity_id === insight.entity_id)?.qlooRank ?? index + 1)
        : index + 1,
      blendedRank: blendedRow?.blendedRank ?? index + 1,
      baselineRank: baselineRankById.get(insight.entity_id) ?? index + 1,
      nationalStoreCount: getNationalStoreCount(insight.entity_id),
      chainSizeTier: tier?.tier,
      tasteFitBeyondChainPercentile: tasteUnavailable
        ? undefined
        : tier?.tasteFitBeyondChainPercentile,
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
  topN = 10,
  presence?: NearbyPresenceCache
): Promise<MapStorePoint[]> {
  const cache = presence ?? new NearbyPresenceCache(catalog, location);
  const top = insights.slice(0, topN);
  const points: MapStorePoint[] = [];

  for (const row of top) {
    const nearby = await cache.storesNearby(row.entity_id, radiusKm);
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
  densityOrStratum: EvalSiteDensity | EvalDensityStratum = 'urban',
  presence?: NearbyPresenceCache
): Promise<{ raw: BacktestResult; blended: BacktestResult }> {
  const all = await buildTripleBacktest(location, insights, radiusKm, catalog, densityOrStratum, presence);
  return { raw: all.raw, blended: all.blended };
}

export async function buildBaselineBacktest(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number,
  catalog: StoreCatalog,
  densityOrStratum: EvalSiteDensity | EvalDensityStratum = 'urban',
  presence?: NearbyPresenceCache
): Promise<BacktestResult> {
  const all = await buildTripleBacktest(location, insights, radiusKm, catalog, densityOrStratum, presence);
  return all.baseline;
}

/** One presence warm-up for raw, blended, and chain-only backtests. */
export async function buildTripleBacktest(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number,
  catalog: StoreCatalog,
  densityOrStratum: EvalSiteDensity | EvalDensityStratum = 'urban',
  presence?: NearbyPresenceCache
): Promise<{ raw: BacktestResult; blended: BacktestResult; baseline: BacktestResult }> {
  const cache = presence ?? new NearbyPresenceCache(catalog, location);
  const brandIds = new Set(catalog.getBrandIds());
  const scoreRadiusKm = presenceRadiusKm(densityOrStratum, radiusKm);
  const poolIds = insights.filter((i) => brandIds.has(i.entity_id)).map((i) => i.entity_id);
  await cache.warmBrandRadii(poolIds, [scoreRadiusKm]);

  const findFromCache = (brandId: string, _lat: number, _lon: number, _r: number) =>
    cache.findNearbyFn(scoreRadiusKm)(brandId, _lat, _lon, _r);

  const raw = computeBacktest(
    insights,
    location.latitude,
    location.longitude,
    scoreRadiusKm,
    findFromCache,
    brandIds
  );

  const blendedOrder = orderInsightsForSite(
    insights,
    location,
    logisticSiteForBlend(location, densityOrStratum, radiusKm)
  ).ordered;
  const blended = computeBacktest(
    blendedOrder,
    location.latitude,
    location.longitude,
    scoreRadiusKm,
    findFromCache,
    brandIds
  );

  const ordered = orderInsightsByNationalStoreCount(insights);
  const baseline = computeBacktest(
    ordered,
    location.latitude,
    location.longitude,
    scoreRadiusKm,
    findFromCache,
    brandIds
  );

  return {
    raw: toBacktestResult(raw),
    blended: toBacktestResult(blended),
    baseline: toBacktestResult(baseline),
  };
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

export async function enrichProspectsWithNearest(
  prospects: ProspectPack[],
  location: Location,
  catalog: StoreCatalog,
  presence?: NearbyPresenceCache,
  osmSnapshot?: OsmSnapshotCatalog | null,
  absenceRadiusKm?: number
): Promise<ProspectPack[]> {
  const cache = presence ?? new NearbyPresenceCache(catalog, location);
  const confirmWithinKm = absenceRadiusKm;
  return Promise.all(
    prospects.map(async (pack) => {
      const reconciled = await reconcileNearestStoreKm(
        pack.brand.entityId,
        location,
        cache,
        osmSnapshot ?? undefined,
        confirmWithinKm !== undefined ? { confirmWithinKm } : undefined
      );
      return {
        ...pack,
        nearestExistingStoreKm: reconciled.km,
        nearestExistingStoreUnconfirmed: reconciled.unconfirmed ? true : undefined,
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
