import type { NearbyTenant, ProspectPack } from '@leaseup/contracts';
import { matchDemoFixtureId } from '@leaseup/fixtures/worker';
import type { QlooClient, QlooLocation } from '../providers/qloo';
import type { ResponseCache } from './response-cache';
import { sha256Short } from './cache-key';
import { encodeGeohash } from './geohash';
import {
  buildCoTenancyLineFromAffinities,
  incumbentEntityIdsForCoAffinity,
  parseCoAffinityFromInsights,
} from './co-tenancy-pairing';
import { brandCategoryLabel } from './brand-category';

const MAX_PROSPECTS = 10;

async function coAffinityCacheKey(
  location: { latitude: number; longitude: number },
  radiusKm: number,
  pitchEntityId: string,
  incumbentIds: string[]
): Promise<string> {
  const hash = encodeGeohash(location.latitude, location.longitude, 7);
  const inc = await sha256Short(incumbentIds.slice().sort().join(','));
  return `co-tenancy:v1:${hash}:${radiusKm}:${pitchEntityId}:${inc}`;
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

  const enriched = await Promise.all(
    targets.map(async (pack) => {
      const incumbentIds = incumbentEntityIdsForCoAffinity(
        params.nearbyTenants,
        pack.brand.entityId
      );
      if (incumbentIds.length === 0) return pack;

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
          if (raw) {
            await params.responseCache.putTextIfChanged(
              cacheKey,
              JSON.stringify(raw),
              86400
            );
          }
        }
      }

      if (!raw) return pack;

      const affinities = parseCoAffinityFromInsights(raw, incumbentIds);
      const line = buildCoTenancyLineFromAffinities(affinities, params.nearbyTenants);
      if (!line) return pack;

      const mean =
        affinities.length > 0
          ? affinities.reduce((s, r) => s + r.affinity, 0) / affinities.length
          : 0;
      const categoryFit = brandCategoryLabel(pack.brand.entityId) ?? pack.tenantMixScore?.categoryFit;

      return {
        ...pack,
        coTenancyLine: line,
        tenantMixScore: {
          score: mean,
          coAffinityMean: mean,
          categoryFit: categoryFit ?? '',
          explanation: line,
        },
      };
    })
  );

  return [...enriched, ...rest];
}
