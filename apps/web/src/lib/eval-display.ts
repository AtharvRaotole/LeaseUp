import type { EvalMetricPanel, StrictEvalSnapshot } from '@leaseup/contracts';
import {
  catalogForPanel,
  formatMetricValue,
  formatP10PercentExact,
  getEvalManifest,
  loadLiveQlooLiftAggregates,
  type EvalMetricPanel as FixturePanel,
} from '@leaseup/fixtures';

export function evalHeadlineLabel(snapshot: StrictEvalSnapshot): string {
  const manifest = getEvalManifest();
  const id = snapshot.headlineMetricId ?? manifest.headlineMetricId;
  if (!id) return 'Headline check: pending (operator will set after live eval)';
  if (id === 'same_size_auc') {
    const agg = loadLiveQlooLiftAggregates();
    const auc = agg.sameSizeAuc;
    return `Among similar-sized chains, ranking matched store locations about ${(auc.value * 100).toFixed(0)}% of the time`;
  }
  const panel = snapshot.panels.find((p) => p.id === id);
  return brokerPanelTitle(panel?.id ?? id, panel?.label ?? id);
}

export function brokerPanelTitle(panelId: string, fallbackLabel: string): string {
  switch (panelId) {
    case 'same_size_auc':
      return 'Rank match among similar chains';
    case 'p10_blend':
    case 'logistic_blend_present_at_10':
      return 'Top 10 hit rate (taste blend)';
    case 'p10_chain':
      return 'Top 10 hit rate (chain size only)';
    case 'p10_raw':
      return 'Top 10 hit rate (taste order only)';
    case 'legacy_present_at10':
      return 'Top 10 hit rate (fixed radius)';
    case 'adaptive_present_at10':
      return 'Top 10 hit rate (tighter radius)';
    case 'spearman':
    case 'spearman_presence':
      return 'Rank order vs stores on the ground';
    default:
      return fallbackLabel.replace(/\bAUC\b/g, 'rank match').replace(/P@10/g, 'top-10 hit rate');
  }
}

/** Short column headers for the methodology metric catalog table. */
export function brokerMetricCatalogShortLabel(metricId: string, fallbackLabel: string): string {
  switch (metricId) {
    case 'same_size_auc':
      return 'Rank match';
    case 'legacy_present_at10':
      return 'Legacy top-10';
    case 'adaptive_present_at10':
      return 'Adaptive top-10';
    case 'spearman_presence':
      return 'Rank vs stores';
    case 'surprise_present_at10':
      return 'Surprise hits';
    case 'random_monte_carlo':
      return 'Random baseline';
    default:
      return brokerPanelTitle(metricId, fallbackLabel);
  }
}

export function brokerEvalNote(note: string): string {
  return note.replace(/\bAUC\b/g, 'rank match').replace(/P@10/g, 'top-10 hit rate');
}

export function formatPanelValues(panel: EvalMetricPanel | FixturePanel): string {
  if (panel.id === 'same_size_auc') {
    const agg = loadLiveQlooLiftAggregates();
    const auc = agg.sameSizeAuc;
    const blend = formatP10PercentExact(agg.logisticBlendPrecisionAt10);
    const chain = formatP10PercentExact(agg.chainSizePrecisionAt10);
    const lift = agg.logisticBlendLiftVsChainPp;
    return `Rank match ${(auc.value * 100).toFixed(1)}% among similar chains · top-10 hits ${blend} taste blend vs ${chain} chain size only (+${lift} pp)`;
  }
  const def = catalogForPanel(panel.id);
  const format = def?.format ?? 'decimal';
  const parts: string[] = [];
  if (panel.qloo !== undefined) {
    parts.push(`Taste rank ${formatMetricValue(format, panel.qloo)}`);
  }
  if (panel.chain !== undefined) {
    parts.push(`chain size ${formatMetricValue(format, panel.chain)}`);
  }
  if (panel.randomExpected !== undefined) {
    parts.push(`random guess ${formatMetricValue(format, panel.randomExpected)}`);
  }
  return parts.join(' · ');
}

export function isHeadlinePanel(snapshot: StrictEvalSnapshot, panelId: string): boolean {
  const id = snapshot.headlineMetricId ?? getEvalManifest().headlineMetricId;
  return Boolean(id && id === panelId);
}
