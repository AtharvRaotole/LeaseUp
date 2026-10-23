import type { Env } from '../index';
import { QlooClient, QLOO_MAX_TAKE } from '../providers/qloo';
import { wickerparkFixture, seviervilleFixture } from '@leaseup/fixtures/worker';
import { createStoreCatalog } from './store-catalog';
import { displayBrandName } from '../lib/brand-display';
import { getResponseCache } from '../lib/worker-cache';

const CACHE_KEY = 'compare:flip:live:v2';

export type CompareFlipPayload = {
  left: { name: string; top: Array<{ entityId: string; name: string; qlooRank: number; affinity: number }> };
  right: { name: string; top: Array<{ entityId: string; name: string; qlooRank: number; affinity: number }> };
  flipExamples: Array<{
    entityId: string;
    name: string;
    wickerRank: number;
    seviervilleRank: number;
    delta: number;
  }>;
  source: string;
};

function topFromInsights(
  insights: Array<{ entity_id: string; name: string; query?: { affinity?: number } }>,
  limit = 8
) {
  const sorted = [...insights].sort(
    (a, b) => (b.query?.affinity ?? 0) - (a.query?.affinity ?? 0)
  );
  return sorted.slice(0, limit).map((row, index) => ({
    entityId: row.entity_id,
    name: displayBrandName(row.entity_id, row.name),
    qlooRank: index + 1,
    affinity: row.query?.affinity ?? 0,
  }));
}

function fixturePayload(sourceLabel: string): CompareFlipPayload {
  const wickerTop = wickerparkFixture.insights.slice(0, 8).map((row, index) => ({
    entityId: row.entity_id,
    name: row.name,
    qlooRank: index + 1,
    affinity: row.affinity,
  }));
  const seviervilleTop = seviervilleFixture.insights.slice(0, 8).map((row, index) => ({
    entityId: row.entity_id,
    name: row.name,
    qlooRank: index + 1,
    affinity: row.affinity,
  }));

  const seviervilleRankById = new Map(
    seviervilleFixture.insights.map((row, index) => [row.entity_id, index + 1])
  );
  const wickerRankById = new Map(
    wickerparkFixture.insights.map((row, index) => [row.entity_id, index + 1])
  );

  const flipExamples = wickerparkFixture.insights
    .map((row) => row.entity_id)
    .filter((id) => seviervilleRankById.has(id))
    .map((entityId) => {
      const rawName =
        wickerparkFixture.insights.find((i) => i.entity_id === entityId)?.name ||
        seviervilleFixture.insights.find((i) => i.entity_id === entityId)?.name ||
        entityId;
      return {
        entityId,
        name: displayBrandName(entityId, rawName),
        wickerRank: wickerRankById.get(entityId) ?? 99,
        seviervilleRank: seviervilleRankById.get(entityId) ?? 99,
        delta: Math.abs((wickerRankById.get(entityId) ?? 99) - (seviervilleRankById.get(entityId) ?? 99)),
      };
    })
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 8);

  return {
    left: { name: wickerparkFixture.location.name, top: wickerTop },
    right: { name: seviervilleFixture.location.name, top: seviervilleTop },
    flipExamples,
    source: sourceLabel,
  };
}

export async function getCompareFlip(env: Env): Promise<CompareFlipPayload> {
  if (env.APP_MODE !== 'live') {
    return fixturePayload('Recorded Qloo fixtures (demo)');
  }

  const edgeCache = getResponseCache();
  const cached = await edgeCache.get(CACHE_KEY, 'text');
  if (typeof cached === 'string') {
    return JSON.parse(cached) as CompareFlipPayload;
  }

  const qloo = new QlooClient(env);
  const catalog = createStoreCatalog(env, 'live');
  const brandIds = catalog.getBrandIds();
  const radiusKm = 10;

  const wickerLoc = {
    kind: 'point' as const,
    latitude: wickerparkFixture.location.latitude,
    longitude: wickerparkFixture.location.longitude,
    radiusKm,
  };
  const seviervilleLoc = {
    kind: 'point' as const,
    latitude: seviervilleFixture.location.latitude,
    longitude: seviervilleFixture.location.longitude,
    radiusKm,
  };

  const take = QLOO_MAX_TAKE;
  const [wickerInsights, seviervilleInsights] = await Promise.all([
    qloo.getBrandInsights({ location: wickerLoc, brandIds, take }),
    qloo.getBrandInsights({ location: seviervilleLoc, brandIds, take }),
  ]);

  const wickerRankById = new Map(
    [...wickerInsights]
      .sort((a, b) => (b.query?.affinity ?? 0) - (a.query?.affinity ?? 0))
      .map((row, index) => [row.entity_id, index + 1])
  );
  const seviervilleRankById = new Map(
    [...seviervilleInsights]
      .sort((a, b) => (b.query?.affinity ?? 0) - (a.query?.affinity ?? 0))
      .map((row, index) => [row.entity_id, index + 1])
  );

  const sharedIds = brandIds.filter(
    (id) => wickerRankById.has(id) && seviervilleRankById.has(id)
  );

  const flipExamples = sharedIds
    .map((entityId) => {
      const name = displayBrandName(
        entityId,
        wickerInsights.find((i) => i.entity_id === entityId)?.name ||
          seviervilleInsights.find((i) => i.entity_id === entityId)?.name ||
          entityId
      );
      const wickerRank = wickerRankById.get(entityId) ?? 99;
      const seviervilleRank = seviervilleRankById.get(entityId) ?? 99;
      return { entityId, name, wickerRank, seviervilleRank, delta: Math.abs(wickerRank - seviervilleRank) };
    })
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 8);

  const payload: CompareFlipPayload = {
    left: { name: wickerparkFixture.location.name, top: topFromInsights(wickerInsights) },
    right: { name: seviervilleFixture.location.name, top: topFromInsights(seviervilleInsights) },
    flipExamples,
    source: 'Live Qloo (cached 1h)',
  };

  await edgeCache.putJsonIfChanged(CACHE_KEY, payload, 3600);
  return payload;
}
