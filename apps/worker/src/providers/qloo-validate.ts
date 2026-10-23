import type { QlooInsight } from './qloo';
import { UpstreamError } from '../lib/errors';

export function assertQlooInsightsValid(
  insights: QlooInsight[],
  requestedBrandIds?: string[]
): void {
  if (insights.length === 0) {
    return;
  }

  const affinities = insights.map((row) => row.query?.affinity ?? 0);
  const allZero = affinities.every((a) => a === 0);

  const matchesInputOrder =
    requestedBrandIds !== undefined &&
    requestedBrandIds.length > 0 &&
    insights.length === requestedBrandIds.length &&
    insights.every((row, index) => row.entity_id === requestedBrandIds[index]);

  if (allZero || matchesInputOrder) {
    throw new UpstreamError(
      'Qloo returned unusable brand insights (location signal not applied or affinities are zero). Check signal.location WKT POINT + radius.',
      502
    );
  }
}
