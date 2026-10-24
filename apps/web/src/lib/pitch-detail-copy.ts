import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { whyBrandTasteSection } from './why-brand-taste-ui';

/** Plain-text lines for pitch PDF / share (taste-first, no duplicate absence blocks). */
export function pitchExpandedLines(
  prospect: ProspectPack,
  results: AnalysisResponse,
  _radiusKm: number
): string[] {
  const lines: string[] = [];
  const taste = whyBrandTasteSection(prospect, results);
  if (taste.summary) lines.push(taste.summary);
  lines.push(...taste.signalLines);
  if (taste.rankLine) lines.push(taste.rankLine);
  return lines;
}
