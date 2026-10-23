import type { EvalSiteDensity } from './types.js';
import { getEvalManifest, buildEvalMetricPanels, buildEvalNotes } from './present-metrics.js';
import type { StrictEvalSiteMetrics } from '../strict-eval.js';

export type EvalSiteSnapshot = {
  manifestId: string;
  headlineMetricId: string | null;
  dataSource: string;
  searchRadiusKm: number;
  adaptiveRadiusKm: number;
  density: EvalSiteDensity;
  poolSize: number;
  panels: ReturnType<typeof buildEvalMetricPanels>;
  notes: string[];
};

export function buildEvalSiteSnapshot(metrics: StrictEvalSiteMetrics): EvalSiteSnapshot {
  const manifest = getEvalManifest();
  return {
    manifestId: manifest.id,
    headlineMetricId: manifest.headlineMetricId,
    dataSource: manifest.dataSource,
    searchRadiusKm: metrics.searchRadiusKm,
    adaptiveRadiusKm: metrics.adaptiveRadiusKm,
    density: metrics.density,
    poolSize: metrics.poolSize,
    panels: buildEvalMetricPanels(metrics),
    notes: buildEvalNotes(metrics),
  };
}
