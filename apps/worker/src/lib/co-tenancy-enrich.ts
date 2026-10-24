import type { NearbyTenant, ProspectPack } from '@leaseup/contracts';
import { matchDemoFixtureId } from '@leaseup/fixtures/worker';
import type { QlooClient, QlooLocation } from '../providers/qloo';
import type { ResponseCache } from './response-cache';
import { sha256Short } from './cache-key';
import { encodeGeohash } from './geohash';
import {
  coTenancyLineFromPicked,
  compactCoTenancyInsights,
  incumbentEntityIdsForCoAffinity,
  parseCoAffinityFromInsights,
  pickPairingsForReport,
  type IncumbentAffinity,
} from './co-tenancy-pairing';

const MAX_PROSPECTS = 10;

async function coAffinityCacheKey(
  location: { latitude: number; longitude: number },
  radiusKm: number,
  pitchEntityId: string,
  incumbentIds: string[]
): Promise<string> {
  const hash = encodeGeohash(location.latitude, location.longitude, 7);
  const inc = await sha256Short(incumbentIds.slice().sort().join(','));
  return `co-tenancy:v2:${hash}:${radiusKm}:${pitchEntityId}:${inc}`;
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

      let raw: unknown;
      if (demoId) {
        raw = await params.qloo.getBrandCoAffinityWithIncumbents({
          location: qlooLocation,
          pitchEntityId: pack.brand.entityId,
          incumbentEntityIds: incumbentIds,
          runId: params.runId,
          demoFixtureId: demoId,
        });
      } else {
        const cacheKey = await coAffinityCacheKey(
          params.location,
          params.radiusKm,
          pack.brand.entityId,
          incumbentIds
        );
        const cached = await params.responseCache.get(cacheKey, 'text');
        if (typeof cached === 'string') {
          raw = JSON.parse(cached) as unknown;
        } else {
          raw = await params.qloo.getBrandCoAffinityWithIncumbents({
            location: qlooLocation,
            pitchEntityId: pack.brand.entityId,
            incumbentEntityIds: incumbentIds,
            runId: params.runId,
          });
          const compact = raw ? compactCoTenancyInsights(raw, pack.brand.entityId) : null;
          if (compact) {
            await params.responseCache.putTextIfChanged(
              cacheKey,
              JSON.stringify(compact),
              86400
            );
          }
        }
      }

      const affinities = raw
        ? parseCoAffinityFromInsights(raw, incumbentIds, pack.brand.entityId)
        : [];
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
      tenantMixScore: pack.tenantMixScore
        ? { ...pack.tenantMixScore, explanation: line }
        : undefined,
    };
  });

  return [...enriched, ...rest];
}
