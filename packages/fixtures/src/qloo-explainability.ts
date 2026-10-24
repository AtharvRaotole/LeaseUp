export type TradeAreaTasteRow = {
  entityId: string;
  name: string;
  affinity: number;
  affinityRank: number;
  /** Location-only Qloo affinity at the pin when overlap was computed. */
  localAffinity?: number;
};

/**
 * Verified brand x local audience overlap for one demo chip and brand, computed from two live Qloo
 * recordings (brand-only and location-only urn:audience insights). `tags` is always empty: tag
 * insights are not used for the Why card (see qloo-brand-taste-overlap.ts).
 */
export type BrandExplainabilityRecording = {
  chip: string;
  brandEntityId: string;
  brandName: string;
  location: { latitude: number; longitude: number };
  radiusKm: number;
  tags: TradeAreaTasteRow[];
  audiences: TradeAreaTasteRow[];
  provenance: {
    recordedAt: string;
    host?: string;
    note?: string;
    brandUrl?: string;
    localUrl?: string;
  };
};

/** Rows of a Qloo urn:audience insights body: entity id, name and query.affinity, verbatim. */
export function parseQlooAudienceRows(
  rawJson: unknown
): Array<{ entityId: string; name: string; affinity: number }> {
  const results = (rawJson as { results?: Record<string, unknown> })?.results ?? {};
  const list = ((results.audiences as unknown[]) ?? (results.entities as unknown[]) ?? []) as Array<
    Record<string, unknown>
  >;
  const rows: Array<{ entityId: string; name: string; affinity: number }> = [];
  for (const row of list) {
    const entityId = row.entity_id ?? row.id;
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const affinity = (row.query as { affinity?: number } | undefined)?.affinity;
    if (!entityId || !name || typeof affinity !== 'number') continue;
    rows.push({ entityId: String(entityId), name, affinity });
  }
  return rows;
}

export function parseQlooExplainabilityRows(
  rawJson: unknown,
  kind: 'tag' | 'audience'
): TradeAreaTasteRow[] {
  const results = (rawJson as { results?: Record<string, unknown> })?.results ?? {};
  const list =
    kind === 'tag'
      ? (results.tags as unknown[]) ?? (results.entities as unknown[]) ?? []
      : (results.audiences as unknown[]) ?? (results.entities as unknown[]) ?? [];

  const rows: TradeAreaTasteRow[] = [];
  for (let index = 0; index < list.length; index++) {
    const row = list[index] as Record<string, unknown>;
    const entityId = row.entity_id ?? row.tag_id ?? row.audience_id ?? row.id;
    if (!entityId) continue;
    const query = row.query as { affinity?: number; affinity_rank?: number } | undefined;
    const affinity = query?.affinity ?? (row.affinity as number | undefined);
    const affinityRank = query?.affinity_rank ?? (row.affinity_rank as number | undefined);
    rows.push({
      entityId: String(entityId),
      name: String(row.name ?? entityId),
      affinity: typeof affinity === 'number' ? affinity : 0,
      affinityRank:
        typeof affinityRank === 'number'
          ? affinityRank
          : typeof affinity === 'number'
            ? affinity
            : index + 1,
    });
  }

  rows.sort((a, b) => {
    if (b.affinityRank !== a.affinityRank) return b.affinityRank - a.affinityRank;
    return b.affinity - a.affinity;
  });

  return rows.slice(0, 8);
}

export function topOverIndexRows(rows: TradeAreaTasteRow[], take = 5): TradeAreaTasteRow[] {
  return rows
    .filter((row) => row.affinity > 0)
    .slice(0, take);
}
