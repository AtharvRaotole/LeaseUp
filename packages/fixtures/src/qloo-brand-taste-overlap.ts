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
 * Lift = the brand's affinity for an audience minus that audience's mean affinity across all 19 recorded
 * live brands (`audiencePanelBaseline`; an audience missing from a brand's top 50 counts as 0.5, Qloo's
 * no-signal value). Passing audiences are ranked by lift and need at least this margin.
 *
 * Why 0.04 (chosen from the recorded lift distribution, Oct 24, 2026; median lift of gate-passing rows
 * 0.087, quartiles 0.037 and 0.125): it is the smallest round margin above every craft and off-price
 * brand's Finance Professional lift that would otherwise reach the card (0.016 to 0.037: TJ Maxx, Old Navy,
 * Hobby Lobby, Michaels, Marshalls, Kohl's, Trader Joe's), and the largest that keeps Ulta's Health & Beauty
 * (0.043). Margins of 0.05 to 0.10 drop Ulta, then TJ Maxx Arts & Crafts (0.074) and Sephora Health & Beauty
 * (0.080), without removing Yoga or Astrology from apparel brands, whose lift there is 0.12 to 0.13.
 */
export const BRAND_AUDIENCE_MIN_PANEL_LIFT = 0.04;

/** The Why card shows at most this many audiences, highest lift first. */
export const BRAND_AUDIENCE_MAX_SHOWN = 2;

/**
 * Sensitive audience categories never shown in broker-facing copy, as a policy (not tuned to results),
 * following how ad platforms restrict sensitive categories for targeting: religion and belief, health
 * conditions, sexual orientation, race and ethnicity, and political affiliation. Matched on Qloo's own
 * audience name, case-insensitive.
 */
export const SENSITIVE_AUDIENCE_NAMES: ReadonlySet<string> = new Set([
  // Religion and belief
  'christianity',
  'islam',
  'judaism',
  'spirituality',
  // Health conditions
  'mental health',
  // Sexual orientation
  'lgbtq',
  // Race and ethnicity
  'aapi',
  'black',
  'latino',
  // Political affiliation
  'politically center',
  'politically conservative',
  'politically progressive',
  'political junkie',
]);

export function isSensitiveAudience(qlooName: string): boolean {
  return SENSITIVE_AUDIENCE_NAMES.has(qlooName.trim().toLowerCase());
}

/**
 * Cosmetic display names for Qloo audience entity ids whose raw names drop punctuation
 * ("Arts Crafts", "Health And Beauty"). Same audience, same id, readable label; never a new category.
 */
export const QLOO_AUDIENCE_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  '604A723B-3E2C-4795-89AA-DF5BA0C3B3C5': 'Arts & Crafts', // Arts Crafts
  '8F0407D3-64F3-47BF-A6B1-BA4C30465F71': 'Health & Beauty', // Health And Beauty
  'AAF408EF-5947-4035-BD34-6678F4A94994': 'Arts & Culture', // Arts Culture
  '42D6F3D0-AD4A-4AC8-B3EE-229775638336': 'Art & Collectibles', // Art Collectibles
  '1B2E2B7F-2FF5-495F-9389-FD4D35A03144': 'Stocks & Bonds', // Stocks Bonds
  'ED8798A4-1EB1-4E53-80EA-4FD08BD3C148': 'Gourmand & Fine Dining', // Gourmand Fine Dining
  'ED9B04EF-C693-44C8-82DE-C2B138710601': 'Jewelry', // Jewellery
  '22D0A7AF-7833-49F3-8E36-42E8D91EEC8B': 'Parents with Young Children', // Parents With Young Children
  '2C606C12-C64F-46B1-BAE6-4FB0C278E612': 'Angel Startup Investing', // Angel Start Up Investing
};

/** Readable label for a Qloo audience: mapped by entity id, otherwise Qloo's own name. */
export function audienceDisplayName(entityId: string, qlooName: string): string {
  return QLOO_AUDIENCE_DISPLAY_NAMES[entityId] ?? qlooName.trim();
}

export type AudienceOverlapOptions = {
  brandMinAffinity?: number;
  brandTopK?: number;
  localTopK?: number;
  /** entityId -> mean affinity across the recorded brand panel (0.5 when absent). */
  panelBaseline?: Record<string, number>;
  minPanelLift?: number;
  /** Most rows returned (default `BRAND_AUDIENCE_MAX_SHOWN`). */
  maxAudiences?: number;
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
 * above `brandMinAffinity`, also in the location's top `localTopK`, and not a sensitive category
 * (`SENSITIVE_AUDIENCE_NAMES`). With `panelBaseline`, the lift (brand affinity minus panel mean) must be
 * at least `minPanelLift` and rows are ranked by lift; without it they are ranked by brand affinity. At
 * most `maxAudiences` rows. Rows carry the brand-only affinity and the local rank. Empty means no verified
 * overlap: callers must omit the taste section rather than fall back to location-only rows.
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
  const maxAudiences = options.maxAudiences ?? BRAND_AUDIENCE_MAX_SHOWN;
  const liftOf = (row: QlooAudienceRow) => row.affinity - (baseline?.[row.entityId] ?? 0.5);

  const localRank = new Map<string, number>();
  sortedByAffinity(localRows)
    .slice(0, localTopK)
    .forEach((row, index) => localRank.set(row.entityId, index + 1));

  const passing = sortedByAffinity(brandRows)
    .slice(0, brandTopK)
    .filter((row) => row.affinity >= brandMin && localRank.has(row.entityId))
    .filter((row) => !isSensitiveAudience(row.name))
    .filter((row) => !baseline || liftOf(row) >= minLift - 1e-9);
  if (baseline) passing.sort((a, b) => liftOf(b) - liftOf(a));

  return passing.slice(0, maxAudiences).map((row) => ({
    entityId: row.entityId,
    name: audienceDisplayName(row.entityId, row.name),
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
 * Reads only `taste.audiences`, which must come from `computeBrandLocalAudienceOverlap` (already ranked
 * by lift, so order is kept).
 * `taste.tags` is ignored on purpose: Qloo tag insights for a brand + location return generic
 * cross-domain tags with near-identical affinity, so they cannot show brand-specific overlap.
 */
export function topBrandTasteOverlapSignals(
  taste: TradeAreaTasteContext | undefined,
  take = BRAND_AUDIENCE_MAX_SHOWN
): BrandTasteOverlapSignal[] {
  if (!taste) return [];
  return taste.audiences
    .filter(
      (row) =>
        row.name.trim().length > 0 &&
        row.affinity >= BRAND_AUDIENCE_MIN_AFFINITY &&
        Number.isInteger(row.affinityRank) &&
        row.affinityRank >= 1 &&
        row.affinityRank <= LOCAL_AUDIENCE_TOP_K &&
        !isSensitiveAudience(row.name)
    )
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
