import type { NearbyTenant } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { sha256Short } from './cache-key';

/**
 * Qloo co-tenancy signal.
 *
 * We call /v2/insights with filter.results.entities = pitched brand and
 * signal.interests.entities = nearby incumbent brands. The response holds a
 * single row (the pitched brand). Its query.affinity is near 0.9 for almost every
 * brand, so it is not used. The useful part is
 * query.explainability["signal.interests.entities"]: one share per incumbent
 * (shares sum to about 1) saying how much each incumbent drove the pitched
 * brand's score. Shares sit close to uniform, so a pairing is only shown when an
 * incumbent clearly stands out for this brand (guards below).
 */

/*
 * Guards (inlined as literals to keep the worker bundle small):
 * - at least 4 incumbents with a share, or the split means nothing;
 * - share must beat the uniform share (1 / incumbents) by 15%;
 * - with 3+ other pitched brands on the report, share must beat this
 *   incumbent's mean share across them by 5%, so a popular chain that tops
 *   every brand is not shown as a pairing for all of them;
 * - one incumbent is named for at most 2 pitched brands per report.
 */

export type IncumbentAffinity = {
  entityId: string;
  /** Explainability share for this incumbent (0..1, sums to about 1). */
  affinity: number;
};

type ExplainRow = { entity_id?: string; score?: number };
type InsightsRow = {
  entity_id?: string;
  id?: string;
  query?: { explainability?: Record<string, ExplainRow[] | undefined> };
};

function pitchRow(raw: unknown, pitchEntityId: string): InsightsRow | undefined {
  const rows = (raw as { results?: { entities?: InsightsRow[] } })?.results?.entities;
  const pitch = pitchEntityId.toUpperCase();
  return rows?.find((row) => String(row?.entity_id ?? row?.id).toUpperCase() === pitch);
}

/** Per-incumbent explainability shares for the pitched brand row. */
export function parseCoAffinityFromInsights(
  raw: unknown,
  incumbentIds: string[],
  pitchEntityId: string
): IncumbentAffinity[] {
  const row = pitchRow(raw, pitchEntityId);
  const explain = row?.query?.explainability?.['signal.interests.entities'];
  if (!Array.isArray(explain)) return [];
  const wanted = new Set(incumbentIds.map((id) => id.toUpperCase()));
  return explain.flatMap((item) => {
    const entityId = String(item?.entity_id).toUpperCase();
    const affinity = item?.score;
    return wanted.has(entityId) && typeof affinity === 'number' && affinity > 0
      ? [{ entityId, affinity }]
      : [];
  });
}

export async function coTenancyFixtureKey(
  pitchEntityId: string,
  incumbentIds: string[]
): Promise<string> {
  const inc = await sha256Short(incumbentIds.slice().sort().join(','));
  return `${pitchEntityId}:${inc}`;
}

export function incumbentEntityIdsForCoAffinity(
  nearby: NearbyTenant[],
  pitchEntityId: string,
  maxIncumbents = 8
): string[] {
  const pitch = pitchEntityId.toUpperCase();
  return nearby
    .filter((row) => row.entityId.toUpperCase() !== pitch)
    .slice(0, maxIncumbents)
    .map((row) => row.entityId);
}

export type PairingCandidate = IncumbentAffinity & {
  /** Share of this pitched brand's explainability (renormalized). */
  share: number;
  /** share / mean share of the same incumbent across peer pitches (1 when no peers). */
  crossLift: number;
};

/**
 * Incumbents that stand out for this pitched brand, strongest first.
 * `peers` are the share lists of the other pitched brands on the same report.
 */
export function pairingCandidates(
  affinities: IncumbentAffinity[],
  peers: IncumbentAffinity[][] = []
): PairingCandidate[] {
  const sum = (list: IncumbentAffinity[]) => list.reduce((s, r) => s + r.affinity, 0);
  const total = sum(affinities);
  if (affinities.length < 4 || !(total > 0)) return [];
  const out: PairingCandidate[] = [];
  for (const row of affinities) {
    const share = row.affinity / total;
    if (share * affinities.length < 1.15) continue;
    const others = peers.flatMap((list) => {
      const hit = list.find((r) => r.entityId === row.entityId);
      return hit ? [hit.affinity / sum(list)] : [];
    });
    const crossLift =
      others.length >= 3 ? (share * others.length) / others.reduce((s, v) => s + v, 0) : 1;
    if (others.length >= 3 && !(crossLift >= 1.05)) continue;
    out.push({ ...row, share, crossLift });
  }
  return out.sort((a, b) => b.share - a.share);
}

/**
 * Report-level pick: guards per brand, then cap how often one incumbent is
 * named so the list does not pair every brand with the same popular chain.
 * When an incumbent qualifies for more brands than the cap, it is kept for the
 * brands where it stands out most (highest cross-pitch lift).
 */
export function pickPairingsForReport(
  lists: IncumbentAffinity[][],
  maxNames = 2,
  maxRepeat = 2
): IncumbentAffinity[][] {
  const candidates = lists.map((list, idx) =>
    pairingCandidates(
      list,
      lists.filter((other, j) => j !== idx && other.length > 0)
    )
  );
  const hits = candidates
    .flatMap((rows, idx) => rows.map((r) => ({ id: r.entityId, idx, lift: r.crossLift })))
    .sort((x, y) => y.lift - x.lift);
  const used = new Map<string, number>();
  const keep = new Set<string>();
  for (const h of hits) {
    const n = used.get(h.id) ?? 0;
    if (n >= maxRepeat) continue;
    used.set(h.id, n + 1);
    keep.add(`${h.idx}:${h.id}`);
  }
  return candidates.map((rows, idx) =>
    rows.filter((r) => keep.has(`${idx}:${r.entityId}`)).slice(0, maxNames)
  );
}

export function coTenancyLineFromPicked(
  picked: IncumbentAffinity[],
  incumbentLookup: NearbyTenant[]
): string | undefined {
  const names = picked.map((row) => {
    const osm = incumbentLookup.find((t) => t.entityId.toUpperCase() === row.entityId);
    return displayBrandName(row.entityId, osm?.name ?? row.entityId);
  });
  return names.length > 0 ? `Pairs well with ${names.join(' and ')} nearby` : undefined;
}
