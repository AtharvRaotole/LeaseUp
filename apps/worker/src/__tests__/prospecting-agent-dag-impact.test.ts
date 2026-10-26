import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { AnalysisService } from '../services/analysis';
import { createQlooRunAccounting, QlooClient } from '../providers/qloo';
import { runProspectingAgentPlanner } from '../lib/prospecting-agent-planner';
import {
  RuleProspectingReviewClient,
  runProspectingAgentReview,
} from '../lib/prospecting-agent-review';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineDemoAnalyzeEnv,
} from './helpers/analysis-test-env';
import { installWorkersCacheApiStub } from './helpers/kv-counting';

const CHIPS = {
  wicker: { address: DEMO_CHIP_ADDRESSES.wicker, latitude: 41.9099418, longitude: -87.6772824 },
  boulder: { address: DEMO_CHIP_ADDRESSES.boulder, latitude: 40.0181, longitude: -105.2786 },
  sevierville: { address: DEMO_CHIP_ADDRESSES.sevierville, latitude: 35.8681, longitude: -83.5618 },
} as const;

async function planAndReview(chip: keyof typeof CHIPS) {
  const env = offlineDemoAnalyzeEnv(createDemoPublicAssetsFetcher(), {
    get: async () => null,
    put: async () => undefined,
  } as unknown as KVNamespace);
  const request = { address: CHIPS[chip].address, radius: 10, storefrontSqFt: 2500 };
  const service = new AnalysisService(env);
  const qloo = new QlooClient(env, createQlooRunAccounting());
  const plan = await runProspectingAgentPlanner({
    env,
    location: {
      address: request.address,
      latitude: CHIPS[chip].latitude,
      longitude: CHIPS[chip].longitude,
      resolvedAddress: request.address,
    },
    radiusKm: request.radius,
    runId: `plan-${chip}`,
    qloo,
  });
  const result = await service.analyzeWithSteps(request, `run-${chip}`, 'ip', undefined, {
    agentDagHooks: plan.dagHooks,
    qlooClient: qloo,
  });
  const callsBeforeReview = qloo.getLogicalCallCount();
  const reviewed = await runProspectingAgentReview({
    prospects: result.prospects,
    client: new RuleProspectingReviewClient(),
    location: { latitude: CHIPS[chip].latitude, longitude: CHIPS[chip].longitude },
  });
  return { plan, result, reviewed, callsBeforeReview, qloo };
}

describe('prospecting agent impact on demo chips', () => {
  beforeEach(() => {
    installWorkersCacheApiStub();
    ensureWorkerGeotiles(join(__dirname, '../../../../'));
  });

  it('only boosts brands whose stratum check found verified local audience overlap', async () => {
    const { plan } = await planAndReview('wicker');
    expect(plan.mode).toBe('agent');
    for (const id of plan.dagHooks.stratumBoostEntityIds ?? []) {
      expect(plan.dagHooks.preloadedTradeAreaTaste?.get(id)?.audiences.length ?? 0).toBeGreaterThan(0);
    }
    for (const step of plan.steps) {
      expect(step.resultSummary).not.toMatch(/[0-9A-F]{8}-[0-9A-F]{4}-/i);
    }
  });

  it('review lifts an evidence-backed Wicker pitch into the top 5 with no extra Qloo calls', async () => {
    const { reviewed, callsBeforeReview, qloo } = await planAndReview('wicker');
    const { review } = reviewed;
    expect(qloo.getLogicalCallCount()).toBe(callsBeforeReview);
    expect(review.planner).toBe('rule');
    expect(review.changed).toBe(true);
    expect(review.after[0]?.entityId).toBe(review.before[0]?.entityId);
    const lifted = review.actions.filter((a) => a.outcome === 'lifted');
    expect(lifted.length).toBeGreaterThan(0);
    for (const action of lifted) {
      const liftedPack = reviewed.prospects.find((p) => p.brand.entityId === action.entityId)!;
      const displacedPack = reviewed.prospects.find((p) => p.brand.entityId === action.aboveEntityId)!;
      expect(liftedPack.tradeAreaTaste?.audiences.length ?? 0).toBeGreaterThan(0);
      expect(displacedPack.tradeAreaTaste?.audiences.length ?? 0).toBe(0);
      // Every applied lift is backed by comparable markets, with the numbers in the reason.
      expect(action.reason).toMatch(/^Rule: lift; .* of panel markets/);
    }
    console.log(JSON.stringify({ before: review.before.map((b) => b.name), after: review.after.map((b) => b.name), action: lifted[0]!.resultSummary }));
  });

  it('review reports every chip honestly, including when it keeps the order', async () => {
    for (const chip of ['boulder', 'sevierville'] as const) {
      const { reviewed } = await planAndReview(chip);
      const { review } = reviewed;
      expect(review.before).toHaveLength(Math.min(5, reviewed.prospects.length));
      if (!review.changed) {
        expect(review.summary).toMatch(/^Review kept the ranked top 5/);
      }
      console.log(chip, JSON.stringify({ changed: review.changed, before: review.before.map((b) => b.name), after: review.after.map((b) => b.name) }));
    }
  });
});
