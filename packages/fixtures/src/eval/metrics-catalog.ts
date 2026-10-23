import type { StrictEvalSiteMetrics } from '../strict-eval.js';

export type EvalCompareWinner = 'qloo' | 'chain' | 'tie' | 'none';

export type EvalMetricDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  /** Higher is better for Qloo when comparing to chain. */
  higherIsBetterForQloo: boolean;
  tieBand: number;
  format: 'count_of_10' | 'decimal' | 'rho';
  qloo: (m: StrictEvalSiteMetrics) => number;
  chain?: (m: StrictEvalSiteMetrics) => number;
  randomExpected?: (m: StrictEvalSiteMetrics) => number;
  randomMonteCarlo?: (m: StrictEvalSiteMetrics) => number;
  detail?: (m: StrictEvalSiteMetrics) => string;
};

export const EVAL_METRIC_CATALOG: EvalMetricDefinition[] = [
  {
    id: 'legacy_present_at10',
    label: 'Legacy present in top 10',
    shortLabel: 'Legacy P@10',
    description: 'Stores present within the user search radius among the top 10 ranked brands.',
    higherIsBetterForQloo: true,
    tieBand: 0,
    format: 'count_of_10',
    qloo: (m) => m.legacyPresentAt10Qloo,
    chain: (m) => m.legacyPresentAt10Chain,
    randomExpected: (m) => m.randomExpectedPresentAt10,
    randomMonteCarlo: (m) => m.randomMonteCarloPresentAt10,
    detail: (m) => `${m.searchRadiusKm} km radius`,
  },
  {
    id: 'adaptive_present_at10',
    label: 'Adaptive-radius present in top 10',
    shortLabel: 'Adaptive P@10',
    description: 'Same as legacy P@10 but presence uses a tighter density-based radius.',
    higherIsBetterForQloo: true,
    tieBand: 0,
    format: 'count_of_10',
    qloo: (m) => m.adaptivePresentAt10Qloo,
    chain: (m) => m.adaptivePresentAt10Chain,
    detail: (m) => `${m.adaptiveRadiusKm} km radius`,
  },
  {
    id: 'spearman_presence',
    label: 'Spearman rank vs presence',
    shortLabel: 'Spearman',
    description: 'Correlation between rank order and binary store presence across the full pool.',
    higherIsBetterForQloo: true,
    tieBand: 0.01,
    format: 'rho',
    qloo: (m) => m.spearmanQloo,
    chain: (m) => m.spearmanChain,
  },
  {
    id: 'surprise_present_at10',
    label: 'Chain-residual hits in top 10',
    shortLabel: 'Surprise hits',
    description:
      'Brands present in the adaptive radius, ranked in the top 10 by taste, but outside the chain-size top 10.',
    higherIsBetterForQloo: true,
    tieBand: 0,
    format: 'count_of_10',
    qloo: (m) => m.surprisePresentAt10Qloo,
    chain: (m) => m.surprisePresentAt10Chain,
  },
  {
    id: 'random_monte_carlo',
    label: 'Random ranking baseline (Monte Carlo)',
    shortLabel: 'Random MC',
    description: 'Mean present@10 over seeded permutations of the brand pool.',
    higherIsBetterForQloo: true,
    tieBand: 0,
    format: 'decimal',
    qloo: (m) => m.legacyPresentAt10Qloo,
    randomMonteCarlo: (m) => m.randomMonteCarloPresentAt10,
    detail: () => 'Compare legacy Qloo P@10 to random order',
  },
];

const BY_ID = new Map(EVAL_METRIC_CATALOG.map((d) => [d.id, d]));

export function evalMetricDefinition(id: string): EvalMetricDefinition | undefined {
  return BY_ID.get(id);
}

export function compareEvalMetric(
  def: EvalMetricDefinition,
  qloo: number,
  chain?: number
): EvalCompareWinner {
  if (chain === undefined) return 'none';
  const delta = qloo - chain;
  if (Math.abs(delta) <= def.tieBand) return 'tie';
  if (def.higherIsBetterForQloo) return delta > 0 ? 'qloo' : 'chain';
  return delta < 0 ? 'qloo' : 'chain';
}
