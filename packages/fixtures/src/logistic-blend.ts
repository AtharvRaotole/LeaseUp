import { logisticBlendCoefficients as coefficients } from './eval/live-qloo-lift/logistic-coefficients-data.js';
import { getNationalStoreCount } from './store-geo.js';
import type { EvalSiteDensity } from './eval/types.js';

export type LogisticBlendCoefficients = typeof coefficients;

export type LogisticBlendSiteTier = 'urban' | 'suburban' | 'exurban' | 'tourist';

export type LogisticBlendSiteContext = {
  radiusKm: number;
  density3km: number;
  tier: LogisticBlendSiteTier;
};

/** Recorded eval site context for demo chips (from data/qloo-eval-40 ground_truth.json). */
export const DEMO_LOGISTIC_SITE_CONTEXT: Record<'wicker' | 'boulder' | 'sevierville', LogisticBlendSiteContext> = {
  wicker: { radiusKm: 1.5, density3km: 232, tier: 'urban' },
  boulder: { radiusKm: 5, density3km: 97, tier: 'suburban' },
  sevierville: { radiusKm: 5, density3km: 74, tier: 'suburban' },
};

export function getLogisticBlendCoefficients(): LogisticBlendCoefficients {
  return coefficients;
}

export function defaultLogisticSiteContext(
  density: EvalSiteDensity = 'urban',
  searchRadiusKm = 10
): LogisticBlendSiteContext {
  return {
    radiusKm: Math.min(searchRadiusKm, density === 'urban' ? 2.5 : density === 'suburban' ? 5 : 7),
    density3km: density === 'urban' ? 200 : density === 'suburban' ? 100 : 50,
    tier: density,
  };
}

function affinityZByEntityId<T extends { entity_id: string; query?: { affinity?: number } }>(
  insights: T[]
): Map<string, number> {
  const affinities = insights.map((i) => i.query?.affinity ?? 0);
  const mean = affinities.reduce((s, v) => s + v, 0) / (affinities.length || 1);
  const std = Math.sqrt(
    affinities.reduce((s, v) => s + (v - mean) ** 2, 0) / (affinities.length || 1)
  );
  const map = new Map<string, number>();
  insights.forEach((row, index) => {
    map.set(row.entity_id, (affinities[index]! - mean) / (std + 1e-12));
  });
  return map;
}

function featureVector(
  entityId: string,
  affZ: number,
  site: LogisticBlendSiteContext
): Record<string, number> {
  const tierUrban = site.tier === 'urban' ? 1 : 0;
  const tierSuburban = site.tier === 'suburban' ? 1 : 0;
  return {
    logChainSize: Math.log1p(getNationalStoreCount(entityId)),
    logRadiusKm: Math.log(site.radiusKm),
    logDensity3km: Math.log1p(site.density3km),
    tierUrban,
    tierSuburban,
    qlooAffinityZ: affZ,
  };
}

function logisticScore(features: Record<string, number>): number {
  const names = coefficients.features;
  let z = coefficients.intercept;
  for (const name of names) {
    const raw = features[name] ?? 0;
    const mu = coefficients.standardize.mean[name];
    const sd = coefficients.standardize.std[name];
    const scaled = (raw - mu) / sd;
    z += coefficients.coefficients[name] * scaled;
  }
  return 1 / (1 + Math.exp(-z));
}

/**
 * Production ranking: pooled M1 logistic (log chain, log radius, log density, tier, Qloo z).
 */
export function orderInsightsByLogisticBlend<
  T extends { entity_id: string; name: string; query?: { affinity?: number } },
>(
  insights: T[],
  densityOrSite: EvalSiteDensity | LogisticBlendSiteContext = 'urban',
  searchRadiusKm = 10
): Array<T & { qlooRank: number; blendedRank: number }> {
  const site: LogisticBlendSiteContext =
    typeof densityOrSite === 'string'
      ? defaultLogisticSiteContext(densityOrSite, searchRadiusKm)
      : densityOrSite;

  const n = insights.length;
  if (n === 0) return [];

  const zById = affinityZByEntityId(insights);

  const scored = insights.map((insight, index) => {
    const affZ = zById.get(insight.entity_id) ?? 0;
    const features = featureVector(insight.entity_id, affZ, site);
    const score = logisticScore(features);
    return {
      ...insight,
      qlooRank: index + 1,
      blendedScore: score,
    };
  });

  scored.sort((a, b) => b.blendedScore - a.blendedScore);

  return scored.map((row, index) => ({
    entity_id: row.entity_id,
    name: row.name,
    query: row.query,
    qlooRank: row.qlooRank,
    blendedRank: index + 1,
  })) as Array<T & { qlooRank: number; blendedRank: number }>;
}
