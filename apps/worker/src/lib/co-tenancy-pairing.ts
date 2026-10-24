import type { NearbyTenant } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { sha256Short } from './cache-key';

/** Minimum Qloo affinity vs an incumbent to mention in broker copy. */
export const CO_TENANCY_PAIR_AFFINITY_MIN = 0.52;

export type IncumbentAffinity = {
  entityId: string;
  name: string;
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

export function pickPairingIncumbents(
  affinities: IncumbentAffinity[],
  minAffinity = CO_TENANCY_PAIR_AFFINITY_MIN,
  maxNames = 2
): IncumbentAffinity[] {
  return affinities
    .filter((row) => row.affinity >= minAffinity)
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, maxNames);
}

export function parseCoAffinityFromInsights(
  raw: unknown,
  incumbentIds: string[]
): IncumbentAffinity[] {
  const wanted = new Set(incumbentIds.map((id) => id.toUpperCase()));
  const results = (raw as { results?: { entities?: unknown[] } })?.results;
  const entities = results?.entities ?? [];
  const out: IncumbentAffinity[] = [];

  for (const row of entities) {
    if (!row || typeof row !== 'object') continue;
    const entityId = String(
      (row as { entity_id?: string }).entity_id ??
        (row as { id?: string }).id ??
        ''
    ).toUpperCase();
    if (!wanted.has(entityId)) continue;
    const affinity =
      (row as { query?: { affinity?: number } }).query?.affinity ??
      (row as { affinity?: number }).affinity;
    if (typeof affinity !== 'number' || !Number.isFinite(affinity)) continue;
    const name = String((row as { name?: string }).name ?? entityId);
    out.push({ entityId, name, affinity });
  }

  return out;
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

export function buildCoTenancyLineFromAffinities(
  affinities: IncumbentAffinity[],
  incumbentLookup: NearbyTenant[]
): string | undefined {
  const picked = pickPairingIncumbents(affinities);
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
