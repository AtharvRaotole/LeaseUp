import type { EvalCompareWinner } from './metrics-catalog.js';
import {
  EVAL_METRIC_CATALOG,
  compareEvalMetric,
  evalMetricDefinition,
} from './metrics-catalog.js';
import type { StrictEvalSiteMetrics } from '../strict-eval.js';
import evalManifest from './manifest.json';
import { loadLiveQlooLiftAggregates } from './live-qloo-lift/load-aggregates.js';

export type EvalMetricPanel = {
  id: string;
  label: string;
  description?: string;
  qloo?: number;
  chain?: number;
  randomExpected?: number;
  randomMonteCarlo?: number;
  winner?: EvalCompareWinner;
  detail?: string;
};

export type EvalManifest = {
  id: string;
  headlineMetricId: string | null;
  resultsBundle: string;
  siteSetId: string;
  dataSource: string;
  displayMetricIds: string[];
  protocolDoc: string;
  note?: string;
};

export function getEvalManifest(): EvalManifest {
  return evalManifest as EvalManifest;
}

export function buildEvalMetricPanels(
  metrics: StrictEvalSiteMetrics,
  metricIds?: string[]
): EvalMetricPanel[] {
  const ids = metricIds ?? getEvalManifest().displayMetricIds;
  const panels: EvalMetricPanel[] = [];

  for (const id of ids) {
    const def = evalMetricDefinition(id);
    if (!def) continue;
    if (id === 'same_size_auc') {
      const agg = loadLiveQlooLiftAggregates();
      panels.push({
        id: def.id,
        label: def.label,
        description: def.description,
        qloo: agg.sameSizeAuc.value,
        detail: `95% CI ${agg.sameSizeAuc.ciLow.toFixed(3)} to ${agg.sameSizeAuc.ciHigh.toFixed(3)} (cohort)`,
        winner: 'none',
      });
      continue;
    }
    const qloo = def.qloo(metrics);
    if (Number.isNaN(qloo)) continue;
    const chain = def.chain?.(metrics);
    const panel: EvalMetricPanel = {
      id: def.id,
      label: def.label,
      description: def.description,
      qloo,
      chain,
      randomExpected: def.randomExpected?.(metrics),
      randomMonteCarlo: def.randomMonteCarlo?.(metrics),
      winner: chain !== undefined ? compareEvalMetric(def, qloo, chain) : 'none',
      detail: def.detail?.(metrics),
    };
    panels.push(panel);
  }

  return panels;
}

export function buildEvalNotes(metrics: StrictEvalSiteMetrics): string[] {
  const notes: string[] = [];
  const cohort = loadLiveQlooLiftAggregates();
  notes.push(
    `Cohort logistic blend P@10 ${(cohort.logisticBlendPrecisionAt10 * 100).toFixed(0)}% vs chain ${(cohort.chainSizePrecisionAt10 * 100).toFixed(0)}% (raw Qloo ${(cohort.rawQlooPrecisionAt10 * 100).toFixed(0)}%).`
  );
  const legacySaturated =
    metrics.legacyPresentAt10Qloo >= 10 && metrics.legacyPresentAt10Chain >= 10;
  if (legacySaturated) {
    notes.push(
      'Legacy present-in-top-10 is saturated at 10 of 10 for both taste and chain-size order.'
    );
  }
  if (metrics.adaptivePresentAt10Qloo < metrics.adaptivePresentAt10Chain) {
    notes.push('Qloo adaptive P@10 is below the chain-size baseline on this pin.');
  }
  if (metrics.legacyPresentAt10Qloo < metrics.randomExpectedPresentAt10) {
    notes.push('Qloo legacy P@10 is below the hypergeometric random expectation.');
  }
  return notes;
}

export function formatMetricValue(
  format: 'count_of_10' | 'decimal' | 'rho',
  value: number
): string {
  if (format === 'count_of_10') {
    return Number.isInteger(value) ? `${value} of 10` : `${value.toFixed(1)} of 10`;
  }
  if (format === 'rho') return value.toFixed(3);
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function catalogForPanel(panelId: string) {
  return EVAL_METRIC_CATALOG.find((d) => d.id === panelId);
}
