import type { EvalMetricPanel, StrictEvalSnapshot } from '@leaseup/contracts';
import {
  catalogForPanel,
  formatMetricValue,
  getEvalManifest,
  loadLiveQlooLiftAggregates,
  type EvalMetricPanel as FixturePanel,
} from '@leaseup/fixtures';

export function evalHeadlineLabel(snapshot: StrictEvalSnapshot): string {
  const manifest = getEvalManifest();
  const id = snapshot.headlineMetricId ?? manifest.headlineMetricId;
  if (!id) return 'Headline metric: pending (operator will set after live eval)';
  if (id === 'same_size_auc') {
    const agg = loadLiveQlooLiftAggregates();
    const auc = agg.sameSizeAuc;
    return `Same-size tier AUC ${(auc.value * 100).toFixed(0)}% (95% CI ${(auc.ciLow * 100).toFixed(0)}% to ${(auc.ciHigh * 100).toFixed(0)}%)`;
  }
  const panel = snapshot.panels.find((p) => p.id === id);
  return panel?.label ?? id;
}

export function formatPanelValues(panel: EvalMetricPanel | FixturePanel): string {
  if (panel.id === 'same_size_auc') {
    const agg = loadLiveQlooLiftAggregates();
    const auc = agg.sameSizeAuc;
    const blend = (agg.logisticBlendPrecisionAt10 * 100).toFixed(0);
    const chain = (agg.chainSizePrecisionAt10 * 100).toFixed(0);
    return `cohort AUC ${(auc.value * 100).toFixed(1)}% · companion blend ${blend}% P@10 vs chain ${chain}%`;
  }
  const def = catalogForPanel(panel.id);
  const format = def?.format ?? 'decimal';
  const parts: string[] = [];
  if (panel.qloo !== undefined) {
    parts.push(`Qloo ${formatMetricValue(format, panel.qloo)}`);
  }
  if (panel.chain !== undefined) {
    parts.push(`chain ${formatMetricValue(format, panel.chain)}`);
  }
  if (panel.randomExpected !== undefined) {
    parts.push(`random exp ${formatMetricValue(format, panel.randomExpected)}`);
  }
  return parts.join(' · ');
}

export function isHeadlinePanel(snapshot: StrictEvalSnapshot, panelId: string): boolean {
  const id = snapshot.headlineMetricId ?? getEvalManifest().headlineMetricId;
  return Boolean(id && id === panelId);
}
