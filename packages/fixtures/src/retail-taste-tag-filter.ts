import type { TradeAreaTasteRow } from './qloo-explainability.js';

export type TasteRowInput = Pick<TradeAreaTasteRow, 'entityId' | 'name' | 'affinity' | 'affinityRank'>;

function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Qloo tag names that are not retail shopper categories for pitch rows. */
const NON_RETAIL_NAMES = new Set(
  [
    'hotel',
    'hotels',
    'motel',
    'motels',
    'lodging',
    'hospitality',
    'resort',
    'resorts',
    'self help',
    'self-help',
    'spirituality',
    'religion',
    'politics',
    'political',
    'american',
    'government',
    'news',
    'media',
    'insurance',
    'finance',
    'banking',
    'healthcare',
    'hospital',
  ].map(normalizeKey)
);

/** Clear Qloo name to broker-facing shopper category (only when unambiguous). */
const SHOPPER_CATEGORY_LABEL: Record<string, string> = {
  'organic food': 'organic grocery',
  'farm to table': 'farm-to-table food',
  'plant-based': 'plant-based foods',
  'outdoor recreation': 'outdoor gear',
  hiking: 'hiking and outdoor',
  camping: 'camping and outdoor',
  streetwear: 'streetwear',
  'beer enthusiasts': 'beer and pubs',
  'cocktail enthusiasts': 'cocktails and bars',
  foodies: 'restaurants and food',
  'health-conscious urbanites': 'health-conscious shoppers',
  'premium grocery shoppers': 'premium grocery',
  'outdoor enthusiasts': 'outdoor shoppers',
  'eco-conscious shoppers': 'eco-conscious shoppers',
  beauty: 'beauty',
  skincare: 'skincare',
  makeup: 'makeup',
  cosmetics: 'beauty',
  social: 'social dining and hangs out',
};

const RETAIL_NAME_PATTERN =
  /\b(organic|grocery|apparel|fashion|beauty|cosmetic|skincare|makeup|athletic|fitness|streetwear|running|outdoor|hiking|camping|home|furniture|decor|coffee|food|plant|farm|dining|restaurant|retail|shop|sport|activewear|footwear|sneaker)\b/i;

function entityIdBlocked(entityId: string): boolean {
  const id = entityId.toLowerCase();
  return (
    id.includes('hotel') ||
    id.includes('lodging') ||
    id.includes('hospitality') ||
    id.includes('self_help') ||
    id.includes('self-help')
  );
}

/** True when a Qloo tag or audience is a known non-retail theme (hotel, self help, politics...). */
export function isNonRetailTasteName(row: Pick<TasteRowInput, 'name'> & { entityId?: string }): boolean {
  const raw = row.name?.trim();
  if (!raw) return true;
  return entityIdBlocked(row.entityId ?? '') || NON_RETAIL_NAMES.has(normalizeKey(raw));
}

/**
 * Map one Qloo tag or audience name to a retail-relevant shopper label, or null to omit.
 */
export function retailShopperTasteLabel(row: TasteRowInput): string | null {
  const raw = row.name?.trim();
  if (!raw || entityIdBlocked(row.entityId)) return null;

  const key = normalizeKey(raw);
  if (NON_RETAIL_NAMES.has(key)) return null;

  const mapped = SHOPPER_CATEGORY_LABEL[key];
  if (mapped) return mapped;

  if (RETAIL_NAME_PATTERN.test(raw)) return raw;

  if (/(enthusiasts|shoppers|foodies)$/i.test(raw) && !NON_RETAIL_NAMES.has(key)) {
    return raw;
  }

  return null;
}

function rowScore(row: TasteRowInput): number {
  if (typeof row.affinityRank === 'number' && row.affinityRank > 0) return row.affinityRank;
  return row.affinity ?? 0;
}

/** Best retail-relevant taste label for pitch-row copy, or null to skip the sentence. */
export function pickRetailShopperTasteLabel(
  tags: TasteRowInput[],
  audiences: TasteRowInput[] = []
): string | null {
  const merged = [...tags, ...audiences];
  if (merged.length === 0) return null;

  merged.sort((a, b) => rowScore(b) - rowScore(a));
  for (const row of merged) {
    const label = retailShopperTasteLabel(row);
    if (label) return label;
  }
  return null;
}

/** Recorded Bleecker-like explainability rows (live Qloo shape) that must not surface on pitch rows. */
export const BLEECKER_LIKE_NON_RETAIL_TASTE: TasteRowInput[] = [
  { entityId: 'urn:tag:genre:qloo:hotel', name: 'Hotel', affinity: 0.99, affinityRank: 0.98 },
  { entityId: 'urn:tag:genre:qloo:self_help', name: 'Self Help', affinity: 0.97, affinityRank: 0.96 },
  { entityId: 'urn:tag:genre:qloo:american', name: 'American', affinity: 0.95, affinityRank: 0.94 },
];
