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
      const cached = await params.responseCache.get(cacheKey, 'text');
      if (typeof cached === 'string') {
        return { pack, affinities: JSON.parse(cached) as IncumbentAffinity[] };
      }
      const raw = await params.qloo.getBrandCoAffinityWithIncumbents({
        location: qlooLocation,
        pitchEntityId: pack.brand.entityId,
        incumbentEntityIds: incumbentIds,
        runId: params.runId,
      });
      const affinities = raw
        ? parseCoAffinityFromInsights(raw, incumbentIds, pack.brand.entityId)
        : [];
      if (affinities.length > 0) {
        await params.responseCache.putTextIfChanged(cacheKey, JSON.stringify(affinities), 86400);
      }
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
