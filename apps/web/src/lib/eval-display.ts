import type { EvalMetricPanel, StrictEvalSnapshot } from '@leaseup/contracts';
import {
  catalogForPanel,
  formatMetricValue,
  getEvalManifest,
  type EvalMetricPanel as FixturePanel,
} from '@leaseup/fixtures';

export function evalHeadlineLabel(snapshot: StrictEvalSnapshot): string {
  const manifest = getEvalManifest();
  const id = snapshot.headlineMetricId ?? manifest.headlineMetricId;
  if (!id) return 'Headline metric: pending (operator will set after live eval)';
  const panel = snapshot.panels.find((p) => p.id === id);
  return panel?.label ?? id;
}

export function formatPanelValues(panel: EvalMetricPanel | FixturePanel): string {
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
