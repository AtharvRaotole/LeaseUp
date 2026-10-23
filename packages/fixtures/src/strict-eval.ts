import { filterInsightsToStoreBrands } from './backtest.js';
import { expectedRandomPresentInTop10 } from './landing-random-baseline.js';
import { orderInsightsByNationalStoreCount } from './ranking.js';
import { findStoresNearby } from './store-geo.js';
import type { FindStoresNearbyFn } from './backtest.js';
import type { EvalSiteDensity } from './eval/types.js';

/** Candidate metric id (headline chosen in eval/manifest.json). */
export const METRIC_ID_SPEARMAN_PRESENCE = 'spearman_presence' as const;

export function adaptiveEvalRadiusKm(
  density: EvalSiteDensity,
  searchRadiusKm: number
): number {
  const capKm: Record<EvalSiteDensity, number> = {
    urban: 3,
    suburban: 5,
    tourist: 4,
    exurban: 7,
  };
  return Math.min(searchRadiusKm, capKm[density] ?? 5);
}

export function spearmanRankCorrelation(ranks: number[], values: number[]): number {
  const n = ranks.length;
  if (n < 2) return 0;
  const meanRank = ranks.reduce((s, v) => s + v, 0) / n;
  const meanVal = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denRank = 0;
  let denVal = 0;
  for (let i = 0; i < n; i++) {
    const dr = ranks[i]! - meanRank;
    const dv = values[i]! - meanVal;
    num += dr * dv;
    denRank += dr * dr;
    denVal += dv * dv;
  }
  const den = Math.sqrt(denRank * denVal);
  if (den === 0) return 0;
  return num / den;
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export function monteCarloRandomPresentAt10(
  pool: Array<{ entity_id: string }>,
  present: Set<string>,
  draws = 400,
  seed = 42
): number {
  if (pool.length === 0) return 0;
  const rand = mulberry32(seed);
  const take = Math.min(10, pool.length);
  let sum = 0;
  for (let d = 0; d < draws; d++) {
    const copy = [...pool];
    shuffleInPlace(copy, rand);
    let hits = 0;
    for (let i = 0; i < take; i++) {
      if (present.has(copy[i]!.entity_id)) hits += 1;
    }
    sum += hits;
  }
  return sum / draws;
}

function presenceSet(
  pool: Array<{ entity_id: string }>,
  lat: number,
  lon: number,
  radiusKm: number,
  findNearby: FindStoresNearbyFn
): Set<string> {
  const present = new Set<string>();
  for (const row of pool) {
    if (findNearby(row.entity_id, lat, lon, radiusKm).length > 0) {
      present.add(row.entity_id);
    }
  }
  return present;
}

function presentInTop10(
  ordered: Array<{ entity_id: string }>,
  present: Set<string>,
  take = 10
): number {
  let hits = 0;
  for (const row of ordered.slice(0, take)) {
    if (present.has(row.entity_id)) hits += 1;
  }
  return hits;
}

function surprisePresentInTop10(
  ordered: Array<{ entity_id: string }>,
  present: Set<string>,
  baselineRankById: Map<string, number>,
  take = 10
): number {
  let hits = 0;
  for (const row of ordered.slice(0, take)) {
    if (!present.has(row.entity_id)) continue;
    const baselineRank = baselineRankById.get(row.entity_id) ?? Number.POSITIVE_INFINITY;
    if (baselineRank > take) hits += 1;
  }
  return hits;
}

function spearmanForOrdering(
  ordered: Array<{ entity_id: string }>,
  present: Set<string>
): number {
  const ranks: number[] = [];
  const values: number[] = [];
  for (let i = 0; i < ordered.length; i++) {
    ranks.push(i + 1);
    values.push(present.has(ordered[i]!.entity_id) ? 1 : 0);
  }
  return spearmanRankCorrelation(ranks, values);
}

export type StrictEvalSiteMetrics = {
  searchRadiusKm: number;
  adaptiveRadiusKm: number;
  density: EvalSiteDensity;
  poolSize: number;
  /** Optional per-site same-size tier AUC when recorded in live eval bundles. */
  sameSizeAucQloo?: number;
  sameSizeAucChain?: number;
  legacyPresentAt10Qloo: number;
  legacyPresentAt10Chain: number;
  adaptivePresentAt10Qloo: number;
  adaptivePresentAt10Chain: number;
  surprisePresentAt10Qloo: number;
  surprisePresentAt10Chain: number;
  spearmanQloo: number;
  spearmanChain: number;
  randomExpectedPresentAt10: number;
  randomMonteCarloPresentAt10: number;
};

export function computeStrictEval(
  insights: Array<{ entity_id: string; name: string }>,
  lat: number,
  lon: number,
  searchRadiusKm: number,
  density: EvalSiteDensity,
  findNearby: FindStoresNearbyFn = findStoresNearby
): StrictEvalSiteMetrics {
  const pool = filterInsightsToStoreBrands(insights);
  const chainOrdered = orderInsightsByNationalStoreCount(insights);
  const baselineRankById = new Map(
    chainOrdered.map((row, index) => [row.entity_id, index + 1])
  );

  const legacyPresentQloo = presenceSet(pool, lat, lon, searchRadiusKm, findNearby);
  const adaptiveRadiusKm = adaptiveEvalRadiusKm(density, searchRadiusKm);
  const adaptivePresentQloo = presenceSet(pool, lat, lon, adaptiveRadiusKm, findNearby);

  const legacyPresentAt10Qloo = presentInTop10(pool, legacyPresentQloo);
  const legacyPresentAt10Chain = presentInTop10(chainOrdered, legacyPresentQloo);
  const adaptivePresentAt10Qloo = presentInTop10(pool, adaptivePresentQloo);
  const adaptivePresentAt10Chain = presentInTop10(chainOrdered, adaptivePresentQloo);

  const surprisePresentAt10Qloo = surprisePresentInTop10(
    pool,
    adaptivePresentQloo,
    baselineRankById
  );
  const surprisePresentAt10Chain = surprisePresentInTop10(
    chainOrdered,
    adaptivePresentQloo,
    baselineRankById
  );

  const spearmanQloo = spearmanForOrdering(pool, legacyPresentQloo);
  const spearmanChain = spearmanForOrdering(chainOrdered, legacyPresentQloo);

  const randomExpectedPresentAt10 = expectedRandomPresentInTop10(
    insights,
    lat,
    lon,
    searchRadiusKm
  );
  const randomMonteCarloPresentAt10 = monteCarloRandomPresentAt10(pool, legacyPresentQloo);

  return {
    searchRadiusKm,
    adaptiveRadiusKm,
    density,
    poolSize: pool.length,
    legacyPresentAt10Qloo,
    legacyPresentAt10Chain,
    adaptivePresentAt10Qloo,
    adaptivePresentAt10Chain,
    surprisePresentAt10Qloo,
    surprisePresentAt10Chain,
    spearmanQloo,
    spearmanChain,
    randomExpectedPresentAt10,
    randomMonteCarloPresentAt10,
  };
}

/** @deprecated use StrictEvalSiteMetrics */
export type StrictEvalMetrics = StrictEvalSiteMetrics;

export function demoFixtureDensity(fixtureId: 'wicker' | 'boulder' | 'sevierville'): EvalSiteDensity {
  if (fixtureId === 'sevierville') return 'tourist';
  return 'urban';
}
