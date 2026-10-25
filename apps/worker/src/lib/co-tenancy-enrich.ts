import { meterSubrequest } from './subrequest-meter';
import type { NearbyTenant, ProspectPack } from '@leaseup/contracts';
import { matchDemoFixtureId } from '@leaseup/fixtures/worker';
import type { QlooClient, QlooLocation } from '../providers/qloo';
import type { ResponseCache } from './response-cache';
import { encodeGeohash } from './geohash';
import {
  coTenancyFixtureKey,
  coTenancyLineFromPicked,
  incumbentEntityIdsForCoAffinity,
  parseCoAffinityFromInsights,
  pickPairingsForReport,
  type IncumbentAffinity,
} from './co-tenancy-pairing';

const MAX_PROSPECTS = 10;

/**
 * Recorded demo shares live in public/co-tenancy/recorded.json (served by ASSETS, kept
 * out of the worker bundle). Per chip: `ids` lists incumbent entity ids once; each
 * entry, keyed by coTenancyFixtureKey, holds `[index into ids, share]` pairs.
 */
export type CoTenancyDemoChip = { ids: string[]; entries: Record<string, { s: [number, number][] }> };

export function demoSharesFromChip(
  chip: CoTenancyDemoChip | undefined,
  key: string
): IncumbentAffinity[] {
  const rows = chip?.entries?.[key]?.s ?? [];
  return rows.flatMap(([i, affinity]) => {
    const id = chip?.ids[i];
    return id ? [{ entityId: id.toUpperCase(), affinity }] : [];
  });
}

let demoManifest: Promise<Record<string, CoTenancyDemoChip> | null> | undefined;

async function demoShares(
  assets: Fetcher | undefined,
  demoId: string,
  pitchEntityId: string,
  incumbentIds: string[]
): Promise<IncumbentAffinity[]> {
  if (!assets) return [];
  if (!demoManifest) meterSubrequest('assets');
  demoManifest ??= assets
    .fetch('https://osm.local/co-tenancy/recorded.json')
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, CoTenancyDemoChip>>) : null))
    .catch(() => null);
  const manifest = await demoManifest;
  if (!manifest) demoManifest = undefined;
  return demoSharesFromChip(manifest?.[demoId], await coTenancyFixtureKey(pitchEntityId, incumbentIds));
}

async function coAffinityCacheKey(
  location: { latitude: number; longitude: number },
  radiusKm: number,
  pitchEntityId: string,
  incumbentIds: string[]
): Promise<string> {
  const hash = encodeGeohash(location.latitude, location.longitude, 7);
  return `co-tenancy:v3:${hash}:${radiusKm}:${await coTenancyFixtureKey(pitchEntityId, incumbentIds)}`;
}

const CO_AFFINITY_MEMO_TTL_MS = 60 * 60 * 1000;
const CO_AFFINITY_MEMO_MAX = 64;
// Settled values only: a pending Promise must never be shared across Worker requests.
const coAffinityMemo = new Map<string, { at: number; value: IncumbentAffinity[] }>();

/** Exposed for tests: number of memoized co-tenancy lookups in this isolate. */
export function coAffinityMemoSize(): number {
  return coAffinityMemo.size;
}

export function clearCoAffinityMemo(): void {
  coAffinityMemo.clear();
}

async function memoCoAffinity(
  key: string,
  load: () => Promise<IncumbentAffinity[]>
): Promise<IncumbentAffinity[]> {
  const hit = coAffinityMemo.get(key);
  if (hit && Date.now() - hit.at < CO_AFFINITY_MEMO_TTL_MS) {
    coAffinityMemo.delete(key);
    coAffinityMemo.set(key, hit);
    return hit.value;
  }
  const value = await load();
  coAffinityMemo.set(key, { at: Date.now(), value });
  while (coAffinityMemo.size > CO_AFFINITY_MEMO_MAX) {
    const oldest = coAffinityMemo.keys().next().value;
    if (oldest === undefined) break;
    coAffinityMemo.delete(oldest);
  }
  return value;
}

export async function enrichProspectsWithCoTenancy(params: {
  qloo: QlooClient;
  responseCache: ResponseCache;
  location: { latitude: number; longitude: number; address: string };
  radiusKm: number;
  runId?: string;
  mode: 'live' | 'demo';
  nearbyTenants: NearbyTenant[];
  prospects: ProspectPack[];
  tasteUnavailable: boolean;
  assets?: Fetcher;
}): Promise<ProspectPack[]> {
  if (params.tasteUnavailable || params.nearbyTenants.length === 0) {
    return params.prospects;
  }

  const demoId = params.mode === 'demo' ? matchDemoFixtureId(params.location.address) : undefined;
  const qlooLocation: QlooLocation = {
    kind: 'point',
    latitude: params.location.latitude,
    longitude: params.location.longitude,
    radiusKm: params.radiusKm,
  };

  const targets = params.prospects.slice(0, MAX_PROSPECTS);
  const rest = params.prospects.slice(MAX_PROSPECTS);

  const fetched = await Promise.all(
    targets.map(async (pack) => {
      const incumbentIds = incumbentEntityIdsForCoAffinity(
        params.nearbyTenants,
        pack.brand.entityId
      );
      if (incumbentIds.length === 0) return { pack, affinities: [] as IncumbentAffinity[] };

      if (demoId) {
        return {
          pack,
          affinities: await demoShares(params.assets, demoId, pack.brand.entityId, incumbentIds),
        };
      }
      if (params.mode === 'demo') return { pack, affinities: [] as IncumbentAffinity[] };

      const cacheKey = await coAffinityCacheKey(
        params.location,
        params.radiusKm,
        pack.brand.entityId,
        incumbentIds
      );
      // In-isolate memo (no Cache API ops): a live prospecting run must stay
      // under the Workers Free 50-subrequest cap, and repeat keys in one run
      // or a quick rerun reuse the in-flight or settled result.
      const affinities = await memoCoAffinity(cacheKey, async () => {
        const raw = await params.qloo.getBrandCoAffinityWithIncumbents({
          location: qlooLocation,
          pitchEntityId: pack.brand.entityId,
          incumbentEntityIds: incumbentIds,
          runId: params.runId,
        });
        return raw ? parseCoAffinityFromInsights(raw, incumbentIds, pack.brand.entityId) : [];
      });
      return { pack, affinities };
    })
  );

  const picked = pickPairingsForReport(fetched.map((row) => row.affinities));
  const enriched = fetched.map(({ pack }, idx) => {
    const line = coTenancyLineFromPicked(picked[idx] ?? [], params.nearbyTenants);
    if (!line) return pack;
    return {
      ...pack,
      coTenancyLine: line,
    };
  });

  return [...enriched, ...rest];
}
