/** Live Qloo tag insights sample (Wicker Park, hackathon API). */
export const WICKER_TRADE_AREA_TAG_INSIGHTS_SAMPLE = {
  results: {
    tags: [
      {
        tag_id: 'urn:tag:customer_identity:qloo:beer_enthusiasts',
        name: 'Beer Enthusiasts',
        types: ['urn:entity:place'],
        subtype: 'urn:tag:customer_identity:qloo',
        tag_value: 'beer_enthusiasts',
        popularity: 0.99987,
        query: { affinity: 0.999957 },
      },
      {
        tag_id: 'urn:tag:customer_identity:qloo:cocktail_enthusiasts',
        name: 'Cocktail Enthusiasts',
        types: ['urn:entity:place'],
        subtype: 'urn:tag:customer_identity:qloo',
        tag_value: 'cocktail_enthusiasts',
        popularity: 0.99985,
        query: { affinity: 0.999945 },
      },
      {
        tag_id: 'urn:tag:ambience:qloo:social',
        name: 'Social',
        types: ['urn:entity:place'],
        subtype: 'urn:tag:ambience:qloo',
        tag_value: 'social',
        popularity: 0.99982,
        query: { affinity: 0.99993 },
      },
      {
        tag_id: 'urn:tag:customer_identity:qloo:foodies',
        name: 'Foodies',
        types: ['urn:entity:place'],
        subtype: 'urn:tag:customer_identity:qloo',
        tag_value: 'foodies',
        popularity: 0.9998,
        query: { affinity: 0.99992 },
      },
      {
        tag_id: 'urn:tag:customer_identity:qloo:regulars',
        name: 'Regulars',
        types: ['urn:entity:place'],
        subtype: 'urn:tag:customer_identity:qloo',
        tag_value: 'regulars',
        popularity: 0.99978,
        query: { affinity: 0.99991 },
      },
    ],
  },
  query: {
    geospatial: {
      panel_size: { context: 12450, target: 11800 },
    },
  },
} as const;

export type TradeAreaShopperGroupId = 'customer_identity' | 'ambience' | 'other';

export type ParsedTradeAreaShopperGroup = {
  id: TradeAreaShopperGroupId;
  label: string;
  names: string[];
};

export type ParsedTradeAreaShoppersSnapshot = {
  groups: ParsedTradeAreaShopperGroup[];
  qlooFields: string[];
};

const SUBTYPE_GROUPS: Record<
  string,
  { id: TradeAreaShopperGroupId; label: string; includeOther?: boolean }
> = {
  'urn:tag:customer_identity:qloo': { id: 'customer_identity', label: 'Who shops here' },
  'urn:tag:ambience:qloo': { id: 'ambience', label: 'Vibe' },
};

const OTHER_GROUP = { id: 'other' as const, label: 'More signals' };

const QLOO_FIELDS = [
  'results.tags[].name',
  'results.tags[].subtype',
  'results.tags[].query.affinity',
  'query.geospatial.panel_size',
];

export const TRADE_AREA_SHOPPER_TAG_SUBTYPES = [
  'urn:tag:customer_identity:qloo',
  'urn:tag:ambience:qloo',
] as const;

type RawTag = {
  tag_id?: string;
  name?: string;
  subtype?: string;
  query?: { affinity?: number };
};

function tagAffinity(tag: RawTag): number {
  const affinity = tag.query?.affinity;
  return typeof affinity === 'number' ? affinity : 0;
}

function groupMeta(subtype: string | undefined): (typeof SUBTYPE_GROUPS)[string] | typeof OTHER_GROUP {
  if (!subtype) return OTHER_GROUP;
  return SUBTYPE_GROUPS[subtype] ?? OTHER_GROUP;
}

/**
 * Parse location-level tag insights (no audiences). Ordering uses query.affinity only.
 */
export function parseQlooTradeAreaTagInsights(
  rawJson: unknown,
  options?: { includeOtherSubtypes?: boolean }
): ParsedTradeAreaShoppersSnapshot | null {
  const includeOther = options?.includeOtherSubtypes ?? false;
  const results = (rawJson as { results?: { tags?: RawTag[] } })?.results;
  const list = results?.tags ?? [];
  if (list.length === 0) return null;

  const sorted = [...list].sort((a, b) => tagAffinity(b) - tagAffinity(a));

  const buckets = new Map<TradeAreaShopperGroupId, { label: string; names: string[] }>();

  for (const tag of sorted) {
    const subtype = tag.subtype;
    const meta = groupMeta(subtype);
    if (meta.id === 'other' && !includeOther) continue;
    const name = tag.name?.trim();
    if (!name) continue;

    const existing = buckets.get(meta.id);
    if (existing) {
      if (!existing.names.includes(name)) existing.names.push(name);
    } else {
      buckets.set(meta.id, { label: meta.label, names: [name] });
    }
  }

  const order: TradeAreaShopperGroupId[] = ['customer_identity', 'ambience', 'other'];
  const groups: ParsedTradeAreaShopperGroup[] = [];
  for (const id of order) {
    const bucket = buckets.get(id);
    if (!bucket || bucket.names.length === 0) continue;
    groups.push({ id, label: bucket.label, names: bucket.names });
  }

  if (groups.length === 0) return null;

  return { groups, qlooFields: QLOO_FIELDS };
}
