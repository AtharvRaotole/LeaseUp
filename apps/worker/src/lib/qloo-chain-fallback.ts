import { orderInsightsByNationalStoreCount } from '@leaseup/fixtures/worker';
import { displayBrandName } from './brand-display';
import { UpstreamError } from './errors';
import type { QlooInsight } from '../providers/qloo';
import type { StoreCatalog } from '../services/store-catalog';

export const TASTE_UNAVAILABLE_RANKING_NOTICE =
  'Taste data is unavailable right now, so this list is ranked by chain size only.';

export function isQlooUnavailableError(err: unknown): boolean {
  return err instanceof UpstreamError && err.code === 'QLOO_UNAVAILABLE';
}

/** ATP catalog ordering with no Qloo affinity fields (no fabricated taste scores). */
export function buildChainSizeInsightsFromCatalog(catalog: StoreCatalog): QlooInsight[] {
  const stubs = catalog.getBrandIds().map((entity_id) => ({
    entity_id,
    name: displayBrandName(entity_id, entity_id),
  }));
  const ordered = orderInsightsByNationalStoreCount(stubs);
  return ordered.map((row) => ({
    entity_id: row.entity_id,
    name: row.name,
  }));
}

export function chainRankedInsights(
  insights: QlooInsight[]
): Array<QlooInsight & { qlooRank: number; blendedRank: number }> {
  const ordered = orderInsightsByNationalStoreCount(insights);
  return ordered.map((row, index) => ({
    ...row,
    qlooRank: index + 1,
    blendedRank: index + 1,
  }));
}
