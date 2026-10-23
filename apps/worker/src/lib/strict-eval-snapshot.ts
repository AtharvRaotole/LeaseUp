import type { StrictEvalSnapshot } from '@leaseup/contracts';
import type { QlooInsight } from '../providers/qloo';
import type { Location } from '@leaseup/contracts';
import {
  adaptiveEvalRadiusKm,
  computeStrictEval,
  buildEvalSiteSnapshot,
  demoAnalyzeStrictEval,
  matchDemoFixtureId,
  type EvalSiteDensity,
  type EvalDensityStratum,
} from '@leaseup/fixtures/worker';
import type { StoreCatalog } from '../services/store-catalog';
import { NearbyPresenceCache } from './nearby-presence-cache';

export async function buildStrictEvalSnapshot(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number,
  density: EvalSiteDensity | EvalDensityStratum,
  catalog: StoreCatalog,
  presence?: NearbyPresenceCache
): Promise<StrictEvalSnapshot> {
  const demoFixtureId = matchDemoFixtureId(location.address);
  if (demoFixtureId) {
    return demoAnalyzeStrictEval(demoFixtureId, radiusKm) as StrictEvalSnapshot;
  }

  const cache = presence ?? new NearbyPresenceCache(catalog, location);
  const brandIds = new Set(catalog.getBrandIds());
  const adaptiveRadiusKm = adaptiveEvalRadiusKm(density, radiusKm);
  const radii = [radiusKm, adaptiveRadiusKm];
  const poolIds = insights.filter((i) => brandIds.has(i.entity_id)).map((i) => i.entity_id);
  await cache.warmBrandRadii(poolIds, radii);

  const findNearby = (brandId: string, lat: number, lon: number, r: number) =>
    cache.findNearbyFn(r)(brandId, lat, lon, r);

  const metrics = computeStrictEval(
    insights,
    location.latitude,
    location.longitude,
    radiusKm,
    density,
    findNearby,
    { monteCarloDraws: 0 }
  );

  return buildEvalSiteSnapshot(metrics);
}
