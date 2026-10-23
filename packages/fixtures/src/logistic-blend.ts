import type { EvalSiteDensity } from './eval/types.js';
import coefficients from './eval/live-qloo-lift/logistic-coefficients.json' with { type: 'json' };
import { getNationalStoreCount } from './store-geo.js';

export type LogisticBlendCoefficients = typeof coefficients;

export function getLogisticBlendCoefficients(): LogisticBlendCoefficients {
  return coefficients;
}

function densityFeatures(density: EvalSiteDensity): Record<string, number> {
  return {
    densityUrban: density === 'urban' ? 1 : 0,
    densitySuburban: density === 'suburban' ? 1 : 0,
    densityExurban: density === 'exurban' ? 1 : 0,
    densityTourist: density === 'tourist' ? 1 : 0,
  };
}

function logisticScore(
  qlooRankScore: number,
  logChainSize: number,
  density: EvalSiteDensity
): number {
  const d = densityFeatures(density);
  const z =
    coefficients.intercept +
    coefficients.qlooRankScore * qlooRankScore +
    coefficients.logChainSize * logChainSize +
    coefficients.densityUrban * (d.densityUrban ?? 0) +
    coefficients.densitySuburban * (d.densitySuburban ?? 0) +
    coefficients.densityExurban * (d.densityExurban ?? 0) +
    coefficients.densityTourist * (d.densityTourist ?? 0);
  return 1 / (1 + Math.exp(-z));
}

/**
 * Companion ranking: logistic blend of Qloo order, chain size, and site density.
 * Preserves original Qloo rank on each row; sorts by blended score for `blendedRank`.
 */
export function orderInsightsByLogisticBlend<
  T extends { entity_id: string; name: string; query?: { affinity?: number } },
>(insights: T[], density: EvalSiteDensity = 'urban'): Array<T & { qlooRank: number; blendedRank: number }> {
  const n = insights.length;
  if (n === 0) return [];

  const scored = insights.map((insight, index) => {
    const qlooRankScore = n <= 1 ? 1 : 1 - index / (n - 1);
    const logChainSize = Math.log1p(getNationalStoreCount(insight.entity_id));
    const score = logisticScore(qlooRankScore, logChainSize, density);
    return {
      ...insight,
      qlooRank: index + 1,
      blendedScore: score,
    };
  });

  scored.sort((a, b) => b.blendedScore - a.blendedScore);

  return scored.map((row, index) => {
    const { blendedScore: _ignored, ...rest } = row;
    return {
      ...(rest as T),
      qlooRank: rest.qlooRank,
      blendedRank: index + 1,
    };
  });
}

