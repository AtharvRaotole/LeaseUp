import { Hono } from 'hono';
import { wickerparkFixture, seviervilleFixture } from '@leaseup/fixtures';

export const compareRouter = new Hono();

function topFromFixture(
  fixture: typeof wickerparkFixture,
  limit = 8
): Array<{ entityId: string; name: string; qlooRank: number; affinity: number }> {
  return fixture.insights.slice(0, limit).map((row, index) => ({
    entityId: row.entity_id,
    name: row.name,
    qlooRank: index + 1,
    affinity: row.affinity,
  }));
}

compareRouter.get('/flip', () => {
  const wickerTop = topFromFixture(wickerparkFixture);
  const seviervilleTop = topFromFixture(seviervilleFixture);

  const seviervilleRankById = new Map(
    seviervilleFixture.insights.map((row, index) => [row.entity_id, index + 1])
  );
  const wickerRankById = new Map(
    wickerparkFixture.insights.map((row, index) => [row.entity_id, index + 1])
  );

  const sharedIds = wickerparkFixture.insights
    .map((row) => row.entity_id)
    .filter((id) => seviervilleRankById.has(id));

  const flipExamples = sharedIds
    .map((entityId) => {
      const name =
        wickerparkFixture.insights.find((i) => i.entity_id === entityId)?.name ||
        seviervilleFixture.insights.find((i) => i.entity_id === entityId)?.name ||
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
      top: wickerTop,
    },
    right: {
      name: seviervilleFixture.location.name,
      top: seviervilleTop,
    },
    flipExamples,
    source: 'Recorded Qloo fixtures (demo)',
  });
});
