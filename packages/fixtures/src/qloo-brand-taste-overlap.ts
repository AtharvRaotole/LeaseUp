import type { TradeAreaTasteRow } from './qloo-explainability.js';

export type TradeAreaTasteContext = {
  tags: TradeAreaTasteRow[];
  audiences: TradeAreaTasteRow[];
};

export type BrandTasteOverlapSignal = {
  kind: 'tag' | 'audience';
  name: string;
  /** Qloo affinity of this audience for the brand alone (no location signal). */
  affinity: number;
  /** 1-based rank of this audience in the location-only Qloo audience list for the pin. */
  affinityRank: number;
};

/** One row of a Qloo urn:audience insights response (name, id and affinity copied verbatim). */
export type QlooAudienceRow = {
  entityId: string;
  name: string;
  affinity: number;
};

/** Qloo reports 0.5 when an audience carries no signal for the query; require real lift above that. */
export const BRAND_AUDIENCE_MIN_AFFINITY = 0.52;
/** Only the brand's most characteristic audiences count as brand-specific. */
export const BRAND_AUDIENCE_TOP_K = 12;
/** Only audiences near the top of the location-only list count as local. */
export const LOCAL_AUDIENCE_TOP_K = 30;

/**
 * Minimum lift of the brand's affinity over the panel baseline (mean affinity of the same audience
 * across other recorded brands). Drops audiences such as Finance Professional that Qloo ranks high
 * for nearly every retailer, so they say nothing about this brand.
 */
export const BRAND_AUDIENCE_MIN_PANEL_LIFT = 0.03;

export type AudienceOverlapOptions = {
  brandMinAffinity?: number;
  brandTopK?: number;
  localTopK?: number;
  /** entityId -> baseline affinity across a panel of other brands (0.5 when absent). */
  panelBaseline?: Record<string, number>;
  minPanelLift?: number;
};

function sortedByAffinity(rows: QlooAudienceRow[]): QlooAudienceRow[] {
  return rows
    .filter((row) => row.entityId && row.name?.trim() && typeof row.affinity === 'number')
    .slice()
    .sort((a, b) => b.affinity - a.affinity);
}

/**
 * Audiences Qloo ties to BOTH the brand (brand-only insights) and the pin (location-only insights).
 *
 * A row is returned only when the audience is in the brand's own top `brandTopK` with affinity at or
 * above `brandMinAffinity`, and also in the location's top `localTopK`. With `panelBaseline`, the
 * brand's affinity must also beat the panel baseline by `minPanelLift`. Rows carry the brand-only
 * affinity and the local rank, sorted by brand affinity. Empty means no verified overlap: callers must
 * omit the taste section rather than fall back to location-only rows.
 */
export function computeBrandLocalAudienceOverlap(
  brandRows: QlooAudienceRow[],
  localRows: QlooAudienceRow[],
  options: AudienceOverlapOptions = {}
): TradeAreaTasteRow[] {
  const brandMin = options.brandMinAffinity ?? BRAND_AUDIENCE_MIN_AFFINITY;
  const brandTopK = options.brandTopK ?? BRAND_AUDIENCE_TOP_K;
  const localTopK = options.localTopK ?? LOCAL_AUDIENCE_TOP_K;
  const baseline = options.panelBaseline;
  const minLift = options.minPanelLift ?? BRAND_AUDIENCE_MIN_PANEL_LIFT;

  const localRank = new Map<string, number>();
  sortedByAffinity(localRows)
    .slice(0, localTopK)
    .forEach((row, index) => localRank.set(row.entityId, index + 1));

  return sortedByAffinity(brandRows)
    .slice(0, brandTopK)
    .filter((row) => row.affinity >= brandMin && localRank.has(row.entityId))
    .filter((row) => !baseline || row.affinity - (baseline[row.entityId] ?? 0.5) >= minLift)
    .map((row) => ({
      entityId: row.entityId,
      name: row.name.trim(),
      affinity: row.affinity,
      affinityRank: localRank.get(row.entityId)!,
    }));
}

function toSignal(row: TradeAreaTasteRow): BrandTasteOverlapSignal {
  return {
    kind: 'audience',
    name: row.name.trim(),
    affinity: row.affinity,
    affinityRank: row.affinityRank,
  };
}

/**
 * Top verified brand x local overlap signals for the Why card.
 *
 * Reads only `taste.audiences`, which must come from `computeBrandLocalAudienceOverlap`.
 * `taste.tags` is ignored on purpose: Qloo tag insights for a brand + location return generic
 * cross-domain tags with near-identical affinity, so they cannot show brand-specific overlap.
 */
export function topBrandTasteOverlapSignals(
  taste: TradeAreaTasteContext | undefined,
  take = 3
): BrandTasteOverlapSignal[] {
  if (!taste) return [];
  return taste.audiences
    .filter(
      (row) =>
        row.name.trim().length > 0 &&
        row.affinity >= BRAND_AUDIENCE_MIN_AFFINITY &&
        Number.isInteger(row.affinityRank) &&
        row.affinityRank >= 1 &&
        row.affinityRank <= LOCAL_AUDIENCE_TOP_K
    )
    .slice()
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, take)
    .map(toSignal);
}

export function formatBrandTasteOverlapLine(signal: BrandTasteOverlapSignal): string {
  const kindLabel = signal.kind === 'tag' ? 'Taste tag' : 'Audience';
  return `${kindLabel}: ${signal.name} (brand affinity ${signal.affinity.toFixed(2)}, #${signal.affinityRank} locally)`;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Deterministic 1 to 2 sentences for demo mode (no model). Restates only the signals. */
export function deterministicWhyBrandTasteSummary(
  brandName: string,
  signals: BrandTasteOverlapSignal[]
): string {
  if (signals.length === 0) return '';
  const names = signals.map((s) => s.name);
  const also =
    names.length === 1
      ? 'which also ranks among the top audiences near this pin'
      : 'which also rank among the top audiences near this pin';
  return `Qloo's ${brandName} audience leans toward ${joinNames(names)}, ${also}.`;
}
