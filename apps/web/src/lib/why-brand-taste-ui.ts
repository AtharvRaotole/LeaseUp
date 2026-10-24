import type { ProspectPack } from '@leaseup/contracts';
import { formatBrandTasteOverlapLine } from '@leaseup/fixtures';
import { whyBrandRankSummaryLine } from './why-brand-lines';
import type { AnalysisResponse } from '@leaseup/contracts';

export type WhyBrandTasteSection = {
  summary?: string;
  signalLines: string[];
  rankLine?: string;
};

export function whyBrandTasteSection(
  prospect: ProspectPack,
  results: AnalysisResponse
): WhyBrandTasteSection {
  const total = results.rankings?.length ?? 0;
  const rank = prospect.brand.affinityRank;
  const rankLine =
    total > 0 && rank > 0 ? whyBrandRankSummaryLine(rank, total) : undefined;

  const taste = prospect.whyBrandTaste;
  if (!taste?.signals?.length) {
    return { rankLine, signalLines: [] };
  }

  return {
    summary: taste.summary,
    signalLines: taste.signals.map((s) => formatBrandTasteOverlapLine(s)),
    rankLine,
  };
}
