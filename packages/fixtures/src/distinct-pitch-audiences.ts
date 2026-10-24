import type { TradeAreaTasteRow } from './qloo-explainability.js';
import { BRAND_AUDIENCE_MAX_SHOWN } from './qloo-brand-taste-overlap.js';

/** Lift-ordered pool size when picking distinct primary audiences across a pitch list. */
export const PITCH_AUDIENCE_CANDIDATE_MAX = 12;

/**
 * Trim each brand's lift-ordered candidate pool to `maxShown` rows. The primary row (index 0) is
 * the first unused entityId in pool order; when every candidate is already taken, repeat the top row.
 *
 * Analyze no longer applies this to pitch copy; each brand keeps its top combined brand x local
 * audience from `computeBrandLocalAudienceOverlap`. Kept for tests and tooling.
 */
export function distinctPitchAudienceLists(
  candidatePools: readonly (readonly TradeAreaTasteRow[])[],
  maxShown = BRAND_AUDIENCE_MAX_SHOWN
): TradeAreaTasteRow[][] {
  const usedPrimary = new Set<string>();
  const out: TradeAreaTasteRow[][] = [];

  for (const pool of candidatePools) {
    if (pool.length === 0) {
      out.push([]);
      continue;
    }
    const primary = pool.find((row) => !usedPrimary.has(row.entityId)) ?? pool[0]!;
    usedPrimary.add(primary.entityId);

    const trimmed: TradeAreaTasteRow[] = [primary];
    for (const row of pool) {
      if (trimmed.length >= maxShown) break;
      if (row.entityId === primary.entityId) continue;
      trimmed.push(row);
    }
    out.push(trimmed);
  }

  return out;
}
