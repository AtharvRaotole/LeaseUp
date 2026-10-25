import { getNationalStoreCount } from '@leaseup/fixtures/worker';
import coefficients from './twin-rank-coefficients.json';
import { twinPresenceShare, type TasteTwinSet } from './taste-twins';

/**
 * Taste twin ranking. The production logistic blend (chain size and Qloo affinity z) plus twinShare: the
 * share of the site's 5 taste twins (panel markets with the closest Qloo taste, over 50 km away) that
 * have a store for the brand. Site context terms are constant inside one site, so the order only
 * depends on the per brand terms shipped here. Fit and leave one address out eval:
 * scripts/eval/build-twin-rank-coefficients.py, data/qloo-eval-40/TWIN_RANK_EVAL.md.
 */

type Feature = 'logChainSize' | 'qlooAffinityZ' | 'twinShare';
type Coefficients = {
  features: Feature[];
  coefficients: Record<Feature, number>;
  mean: Record<Feature, number>;
  std: Record<Feature, number>;
};
const C = coefficients as unknown as Coefficients;

type InsightLike = { entity_id: string; name: string; query?: { affinity?: number } };

export function twinRankScore(features: Record<Feature, number>): number {
  let s = 0;
  for (const name of C.features) s += C.coefficients[name] * ((features[name] - C.mean[name]) / C.std[name]);
  return s;
}

export function orderInsightsByTwinBlend<T extends InsightLike>(
  insights: T[],
  set: TasteTwinSet
): Array<T & { qlooRank: number; blendedRank: number; twinShare?: number }> {
  const n = insights.length;
  if (n === 0) return [];
  const aff = insights.map((i) => i.query?.affinity ?? 0);
  const mean = aff.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(aff.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  const shares = insights.map((i) => twinPresenceShare(i.entity_id, set));
  const known = shares.filter((v): v is number => v !== undefined);
  // Brands outside the 40 site panel get the average twin share of this run, so they are neither helped nor hurt.
  const fallback = known.length ? known.reduce((s, v) => s + v, 0) / known.length : C.mean.twinShare;
  const scored = insights.map((insight, index) => ({
    insight,
    index,
    share: shares[index],
    score: twinRankScore({
      logChainSize: Math.log1p(getNationalStoreCount(insight.entity_id)),
      qlooAffinityZ: (aff[index]! - mean) / (sd + 1e-12),
      twinShare: shares[index] ?? fallback,
    }),
  }));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map((row, rank) => ({
    ...row.insight,
    qlooRank: row.index + 1,
    blendedRank: rank + 1,
    ...(row.share !== undefined ? { twinShare: row.share } : {}),
  }));
}
