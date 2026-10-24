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

/** Share must beat the uniform share (1 / incumbents) by this factor. */
export const CO_TENANCY_SHARE_LIFT_MIN = 1.15;
/**
 * Share must beat this incumbent's mean share across the other pitched brands on
 * the same report by this factor, so an incumbent that tops every brand (a
 * popular chain) is not shown as a pairing for all of them.
 */
export const CO_TENANCY_CROSS_LIFT_MIN = 1.05;
/** Cross-pitch guard needs this many other pitched brands with data. */
export const CO_TENANCY_CROSS_MIN_PEERS = 3;
/** One incumbent may be named for at most this many pitched brands per report. */
export const CO_TENANCY_MAX_REPEAT = 2;
/** Need at least this many incumbents with a share for the split to mean anything. */
export const CO_TENANCY_MIN_INCUMBENTS = 4;

export type IncumbentAffinity = {
  entityId: string;
  name: string;
  /** Explainability share for this incumbent (0..1, sums to about 1). */
  affinity: number;
};

export function formatCoTenancyPairingLine(brandNames: string[]): string | undefined {
  const names = brandNames.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) return undefined;
  if (names.length === 1) return `Pairs well with ${names[0]} nearby`;
  if (names.length === 2) return `Pairs well with ${names[0]} and ${names[1]} nearby`;
  const head = names.slice(0, -1).join(', ');
  const last = names[names.length - 1];
  return `Pairs well with ${head}, and ${last} nearby`;
}

type ExplainRow = { entity_id?: string; score?: number };
type InsightsRow = {
  entity_id?: string;
  id?: string;
  name?: string;
  query?: { affinity?: number; explainability?: Record<string, ExplainRow[] | undefined> };
};

function pitchRow(raw: unknown, pitchEntityId: string): InsightsRow | undefined {
  const entities = (raw as { results?: { entities?: unknown[] } })?.results?.entities ?? [];
  const pitch = pitchEntityId.toUpperCase();
  for (const row of entities) {
    if (!row || typeof row !== 'object') continue;
    const id = String((row as InsightsRow).entity_id ?? (row as InsightsRow).id ?? '').toUpperCase();
    if (id === pitch) return row as InsightsRow;
  }
  return undefined;
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
  const out: IncumbentAffinity[] = [];
  for (const item of explain) {
    const entityId = String(item?.entity_id ?? '').toUpperCase();
    const score = item?.score;
    if (!wanted.has(entityId)) continue;
    if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) continue;
    out.push({ entityId, name: entityId, affinity: score });
  }
  return out;
}

/** Keep only what the parser needs (demo fixtures stay small). */
export function compactCoTenancyInsights(raw: unknown, pitchEntityId: string): unknown | null {
  const row = pitchRow(raw, pitchEntityId);
  const explain = row?.query?.explainability?.['signal.interests.entities'];
  if (!row || !Array.isArray(explain)) return null;
  return {
    results: {
      entities: [
        {
          entity_id: row.entity_id ?? row.id,
          name: row.name,
          query: {
            affinity: row.query?.affinity,
            explainability: {
              'signal.interests.entities': explain.map((e) => ({
                entity_id: e.entity_id,
                score: e.score,
              })),
            },
          },
        },
      ],
    },
  };
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
  if (affinities.length < CO_TENANCY_MIN_INCUMBENTS) return [];
  const total = affinities.reduce((s, r) => s + r.affinity, 0);
  if (!(total > 0)) return [];
  const uniform = 1 / affinities.length;

  const peerShares = (entityId: string): number[] => {
    const out: number[] = [];
    for (const list of peers) {
      const peerTotal = list.reduce((s, r) => s + r.affinity, 0);
      const hit = list.find((r) => r.entityId === entityId);
      if (hit && peerTotal > 0) out.push(hit.affinity / peerTotal);
    }
    return out;
  };

  const out: PairingCandidate[] = [];
  for (const row of affinities) {
    const share = row.affinity / total;
    if (share < uniform * CO_TENANCY_SHARE_LIFT_MIN) continue;
    const others = peerShares(row.entityId);
    let crossLift = 1;
    if (others.length >= CO_TENANCY_CROSS_MIN_PEERS) {
      const mean = others.reduce((s, v) => s + v, 0) / others.length;
      crossLift = mean > 0 ? share / mean : 1;
      if (crossLift < CO_TENANCY_CROSS_LIFT_MIN) continue;
    }
    out.push({ ...row, share, crossLift });
  }
  return out.sort((a, b) => b.share - a.share);
}

/** Single-brand pick (no report context): top names that clear the guards. */
export function pickPairingIncumbents(
  affinities: IncumbentAffinity[],
  peers: IncumbentAffinity[][] = [],
  maxNames = 2
): IncumbentAffinity[] {
  return pairingCandidates(affinities, peers).slice(0, maxNames);
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
  maxRepeat = CO_TENANCY_MAX_REPEAT
): IncumbentAffinity[][] {
  const candidates = lists.map((list, idx) =>
    pairingCandidates(
      list,
      lists.filter((other, j) => j !== idx && other.length > 0)
    )
  );
  const allowed = new Map<string, Set<number>>();
  const byIncumbent = new Map<string, Array<{ idx: number; crossLift: number }>>();
  candidates.forEach((rows, idx) => {
    for (const row of rows) {
      const bucket = byIncumbent.get(row.entityId) ?? [];
      bucket.push({ idx, crossLift: row.crossLift });
      byIncumbent.set(row.entityId, bucket);
    }
  });
  for (const [entityId, hits] of byIncumbent) {
    const keep = hits
      .slice()
      .sort((a, b) => b.crossLift - a.crossLift)
      .slice(0, maxRepeat)
      .map((h) => h.idx);
    allowed.set(entityId, new Set(keep));
  }
  return candidates.map((rows, idx) =>
    rows.filter((row) => allowed.get(row.entityId)?.has(idx)).slice(0, maxNames)
  );
}

export function coTenancyLineFromPicked(
  picked: IncumbentAffinity[],
  incumbentLookup: NearbyTenant[]
): string | undefined {
  if (picked.length === 0) return undefined;
  const names = picked.map((row) => {
    const fromOsm = incumbentLookup.find(
      (t) => t.entityId.toUpperCase() === row.entityId.toUpperCase()
    );
    const label = fromOsm?.name ?? row.name;
    return displayBrandName(row.entityId, label);
  });
  return formatCoTenancyPairingLine(names);
}

export function buildCoTenancyLineFromAffinities(
  affinities: IncumbentAffinity[],
  incumbentLookup: NearbyTenant[],
  peers: IncumbentAffinity[][] = []
): string | undefined {
  return coTenancyLineFromPicked(pickPairingIncumbents(affinities, peers), incumbentLookup);
}
