import type { StrictEvalSnapshot } from '@leaseup/contracts';
import type { QlooInsight } from '../providers/qloo';
import type { Location } from '@leaseup/contracts';
import {
  adaptiveEvalRadiusKm,
  computeStrictEval,
  buildEvalSiteSnapshot,
  type EvalSiteDensity,
} from '@leaseup/fixtures';
import type { StoreCatalog } from '../services/store-catalog';

export async function buildStrictEvalSnapshot(
  location: Location,
  insights: QlooInsight[],
  radiusKm: number,
  density: EvalSiteDensity,
  catalog: StoreCatalog
): Promise<StrictEvalSnapshot> {
  const brandIds = new Set(catalog.getBrandIds());
  const adaptiveRadiusKm = adaptiveEvalRadiusKm(density, radiusKm);
  const radii = [radiusKm, adaptiveRadiusKm];
  const cache = new Map<string, Map<number, Array<{ distance: number }>>>();

  for (const insight of insights.filter((i) => brandIds.has(i.entity_id))) {
    const byRadius = new Map<number, Array<{ distance: number }>>();
    for (const r of radii) {
      const rows = await catalog.findStoresNearby(
        insight.entity_id,
        location.latitude,
        location.longitude,
        r
      );
      byRadius.set(r, rows.map((s) => ({ distance: s.distance })));
    }
    cache.set(insight.entity_id, byRadius);
  }

  const findNearby = (brandId: string, _lat: number, _lon: number, r: number) =>
    cache.get(brandId)?.get(r) ?? [];

  const metrics = computeStrictEval(
    insights,
    location.latitude,
    location.longitude,
    radiusKm,
    density,
    findNearby
  );

  return buildEvalSiteSnapshot(metrics);
}
