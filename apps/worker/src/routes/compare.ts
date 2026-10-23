import { Hono } from 'hono';
import {
  wickerparkFixture,
  seviervilleFixture,
  blendWithNationalPrior,
} from '@leaseup/fixtures';

export const compareRouter = new Hono();

compareRouter.get('/flip', () => {
  const wickerInsights = wickerparkFixture.insights.map((row) => ({
    entity_id: row.entity_id,
    name: row.name,
    query: { affinity: row.affinity },
  }));
  const seviervilleInsights = seviervilleFixture.insights.map((row) => ({
    entity_id: row.entity_id,
    name: row.name,
    query: { affinity: row.affinity },
  }));

  const wickerBlended = blendWithNationalPrior(wickerInsights);
  const seviervilleBlended = blendWithNationalPrior(seviervilleInsights);

  const seviervilleRankById = new Map(
    seviervilleBlended.map((row) => [row.entity_id, row.qlooRank])
  );
  const wickerRankById = new Map(wickerBlended.map((row) => [row.entity_id, row.qlooRank]));

  const sharedIds = wickerInsights
    .map((row) => row.entity_id)
    .filter((id) => seviervilleRankById.has(id));

  const flipExamples = sharedIds
    .map((entityId) => {
      const name =
        wickerInsights.find((i) => i.entity_id === entityId)?.name ||
        seviervilleInsights.find((i) => i.entity_id === entityId)?.name ||
        entityId;
      const wickerRank = wickerRankById.get(entityId) ?? 99;
      const seviervilleRank = seviervilleRankById.get(entityId) ?? 99;
      return {
        entityId,
        name,
        wickerRank,
        seviervilleRank,
        delta: Math.abs(wickerRank - seviervilleRank),
      };
    })
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 8);

  return Response.json({
    left: {
      name: wickerparkFixture.location.name,
      top: wickerBlended.slice(0, 8).map((row) => ({
        entityId: row.entity_id,
        name: row.name,
        qlooRank: row.qlooRank,
        affinity: row.query?.affinity ?? 0,
      })),
    },
    right: {
      name: seviervilleFixture.location.name,
      top: seviervilleBlended.slice(0, 8).map((row) => ({
        entityId: row.entity_id,
        name: row.name,
        qlooRank: row.qlooRank,
        affinity: row.query?.affinity ?? 0,
      })),
    },
    flipExamples,
    source: 'Recorded Qloo fixtures (demo)',
  });
});
