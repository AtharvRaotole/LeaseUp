import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProspectPack } from '@leaseup/contracts';
import {
  applyReviewLift,
  OpenAiProspectingReviewClient,
  RuleProspectingReviewClient,
  runProspectingAgentReview,
  type ProspectingReviewClient,
} from '../lib/prospecting-agent-review';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function pack(n: number, overlaps: number): ProspectPack {
  return {
    brand: { entityId: ID(n), name: `Brand ${n}`, affinity: 0.5, affinityRank: n },
    tradeAreaTaste: overlaps
      ? {
          tags: [],
          audiences: Array.from({ length: overlaps }, (_, i) => ({
            entityId: `aud-${n}-${i}`,
            name: `Audience ${i}`,
            affinity: 0.4,
            affinityRank: i + 1,
          })),
        }
      : undefined,
    reasons: [],
  } as unknown as ProspectPack;
}

const LIST = [pack(1, 2), pack(2, 0), pack(3, 1), pack(4, 0), pack(5, 0), pack(6, 2), pack(7, 0)];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('applyReviewLift guardrails', () => {
  it('lifts an evidence-backed brand above a top-5 brand with none', () => {
    const out = applyReviewLift(LIST, { entityId: ID(6), aboveEntityId: ID(2), reason: 'x' });
    expect(out.ok).toBe(true);
    expect(out.prospects.map((p) => p.brand.name).slice(0, 3)).toEqual(['Brand 1', 'Brand 6', 'Brand 2']);
    expect(out.summary).toBe('Brand 6 moved from #6 to #2 (2 verified local audience overlaps); Brand 2 has none.');
  });

  it.each([
    [{ entityId: ID(7), aboveEntityId: ID(2) }, /no verified local audience overlap/],
    [{ entityId: ID(6), aboveEntityId: ID(3) }, /already has 1 verified local audience overlap/],
    [{ entityId: ID(3), aboveEntityId: ID(6) }, /outside the top 5/],
    [{ entityId: ID(3), aboveEntityId: ID(5) }, /already ranks above/],
    [{ entityId: 'nope', aboveEntityId: ID(2) }, /must be on the ranked shortlist/],
  ])('rejects %o', (req, msg) => {
    const out = applyReviewLift(LIST, { ...req, reason: 'x' });
    expect(out.ok).toBe(false);
    expect(out.prospects).toBe(LIST);
    expect(out.summary).toMatch(msg);
  });
});

describe('runProspectingAgentReview', () => {
  it('rule reviewer keeps #1 and lifts the best evidence-backed pitch once', async () => {
    const { prospects, review } = await runProspectingAgentReview({
      prospects: LIST,
      client: new RuleProspectingReviewClient(),
    });
    expect(review.planner).toBe('rule');
    expect(review.changed).toBe(true);
    expect(prospects[0]!.brand.entityId).toBe(ID(1));
    expect(review.after.map((b) => b.name)).toEqual(['Brand 1', 'Brand 3', 'Brand 2', 'Brand 4', 'Brand 5']);
    expect(review.summary).toBe('Review changed the top 5 with 1 evidence-backed lift.');
  });

  it('keeps the order and says so when every top-5 pitch has evidence', async () => {
    const all = [pack(1, 1), pack(2, 1), pack(3, 1), pack(4, 1), pack(5, 1), pack(6, 2)];
    const { review } = await runProspectingAgentReview({
      prospects: all,
      client: new RuleProspectingReviewClient(),
    });
    expect(review.changed).toBe(false);
    expect(review.actions).toHaveLength(0);
    expect(review.summary).toBe('Review kept the ranked top 5.');
  });

  it('logs model lifts the guardrail rejects and feeds results back to the model', async () => {
    const bodies: Array<{ messages: Array<{ role: string; content?: string }> }> = [];
    const responses = [
      {
        content: null,
        tool_calls: [
          { id: 'c1', type: 'function', function: { name: 'lift_pitch', arguments: JSON.stringify({ entityId: ID(7), aboveEntityId: ID(2), reason: 'Try 7' }) } },
        ],
      },
      {
        content: null,
        tool_calls: [
          { id: 'c2', type: 'function', function: { name: 'lift_pitch', arguments: JSON.stringify({ entityId: ID(6), aboveEntityId: ID(4), reason: 'Brand 6 has local audience evidence' }) } },
        ],
      },
      { content: 'Order looks good.', tool_calls: undefined },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: string }) => {
        bodies.push(JSON.parse(init.body));
        const message = responses.shift()!;
        return new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 });
      })
    );
    const client = new OpenAiProspectingReviewClient('k', 'gpt-4o-mini');
    const { review } = await runProspectingAgentReview({ prospects: LIST, client });
    expect(review.planner).toBe('model');
    expect(review.actions.map((a) => a.outcome)).toEqual(['rejected', 'lifted']);
    expect(review.after.map((b) => b.name)).toEqual(['Brand 1', 'Brand 2', 'Brand 3', 'Brand 6', 'Brand 4']);
    expect(bodies).toHaveLength(3);
    expect(JSON.stringify(bodies[1]!.messages)).toContain('no verified local audience overlap');
    expect(bodies.every((b) => (b as unknown as { model: string }).model === 'gpt-4o-mini')).toBe(true);
  });

  it('falls back to the rule reviewer when the model fails, and records why', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('busy', { status: 503 })));
    const { review } = await runProspectingAgentReview({
      prospects: LIST,
      client: new OpenAiProspectingReviewClient('k', 'gpt-4o-mini'),
    });
    expect(review.planner).toBe('rule');
    expect(review.fallbackReason).toBe('OpenAI review error: 503');
    expect(review.actions.every((a) => a.planner === 'rule')).toBe(true);
  });

  it('enforces the lift budget', async () => {
    const greedy: ProspectingReviewClient = {
      kind: 'model',
      nextTurn: async () => ({
        lifts: [
          { entityId: ID(6), aboveEntityId: ID(2), reason: 'a' },
          { entityId: ID(3), aboveEntityId: ID(2), reason: 'b' },
          { entityId: ID(1), aboveEntityId: ID(4), reason: 'c' },
        ],
        done: false,
      }),
    };
    const { review } = await runProspectingAgentReview({ prospects: LIST, client: greedy });
    expect(review.actions.filter((a) => a.outcome === 'lifted').length).toBeLessThanOrEqual(2);
  });
});
