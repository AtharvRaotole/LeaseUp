import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProspectPack } from '@leaseup/contracts';
import type { Env } from '../index';
import {
  applyReviewLift,
  eligibleReviewLifts,
  reviewShortlist,
  OpenAiProspectingReviewClient,
  createProspectingReviewClient,
  RuleProspectingReviewClient,
  runProspectingAgentReview,
  type ProspectingReviewClient,
} from '../lib/prospecting-agent-review';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function pack(n: number, overlaps: number, checked = true, rank = n): ProspectPack {
  return {
    brand: { entityId: ID(n), name: `Brand ${n}`, affinity: 0.5, affinityRank: rank },
    tradeAreaTasteChecked: checked,
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
    expect(out.summary).toBe('Brand 6 moved from #6 to #2 (2 verified local audience overlaps); Brand 2 was checked and has none.');
  });

  it('never displaces a brand whose overlap was not checked (unknown is not evidence)', () => {
    const list = [pack(1, 2), pack(2, 0, false), pack(3, 0), pack(4, 1), pack(5, 1), pack(6, 2)];
    const out = applyReviewLift(list, { entityId: ID(6), aboveEntityId: ID(2), reason: 'x' });
    expect(out.ok).toBe(false);
    expect(out.summary).toMatch(/was not checked, so it is unknown/);
    expect(applyReviewLift(list, { entityId: ID(6), aboveEntityId: ID(3), reason: 'x' }).ok).toBe(true);
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

  it('rule reviewer skips unchecked brands and the outcome compares with the standard ranking', async () => {
    const list = [pack(1, 2), pack(2, 0, false), pack(3, 0), pack(4, 1), pack(5, 1), pack(6, 2)];
    const { review } = await runProspectingAgentReview({
      prospects: list,
      client: new RuleProspectingReviewClient(),
    });
    expect(review.after.map((b) => b.name)).toEqual(['Brand 1', 'Brand 2', 'Brand 4', 'Brand 3', 'Brand 5']);
    expect(review.outcome.standardTop5.map((b) => b.name)).toEqual([
      'Brand 1',
      'Brand 2',
      'Brand 3',
      'Brand 4',
      'Brand 5',
    ]);
    expect(review.outcome.top3Changed).toBe(true);
    expect(review.outcome.enteredTop5).toEqual([]);
    expect(review.outcome.leftTop5).toEqual([]);
    expect(review.outcome.summary).toBe('Changed vs the standard ranking: Brand 4 #4 to #3; Brand 3 #3 to #4.');
  });

  it('standard ranking ignores a planner boost already in the list order', async () => {
    const boosted = [pack(4, 1, true, 4), pack(1, 1), pack(2, 1), pack(3, 1), pack(5, 1)];
    const { review } = await runProspectingAgentReview({
      prospects: boosted,
      client: new RuleProspectingReviewClient(),
    });
    expect(review.changed).toBe(false);
    expect(review.outcome.standardTop5.map((b) => b.name)).toEqual([
      'Brand 1',
      'Brand 2',
      'Brand 3',
      'Brand 4',
      'Brand 5',
    ]);
    expect(review.outcome.top3Changed).toBe(true);
    expect(review.outcome.top5Changed).toBe(true);
  });

  it('uses the model reviewer on every live run, demo chips included, and the rule otherwise', () => {
    const live = { APP_MODE: 'live', OPENAI_API_KEY: 'k' } as unknown as Env;
    expect(createProspectingReviewClient(live).kind).toBe('model');
    expect(createProspectingReviewClient({ ...live, APP_MODE: 'demo' } as Env).kind).toBe('rule');
    expect(createProspectingReviewClient({ ...live, OPENAI_API_KEY: '' } as Env).kind).toBe('rule');
  });

  it('keeps the order and says so when every top-5 pitch has evidence', async () => {
    const all = [pack(1, 1), pack(2, 1), pack(3, 1), pack(4, 1), pack(5, 1), pack(6, 2)];
    const { review } = await runProspectingAgentReview({
      prospects: all,
      client: new RuleProspectingReviewClient(),
    });
    expect(review.changed).toBe(false);
    expect(review.actions).toHaveLength(0);
    expect(review.summary).toBe('Review kept the ranked top 5: no lift passes the evidence check.');
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
        return new Response(
          JSON.stringify({ choices: [{ message }], usage: { prompt_tokens: 100, completion_tokens: 20 } }),
          { status: 200 }
        );
      })
    );
    const client = new OpenAiProspectingReviewClient('k', 'gpt-4o-mini');
    const { review } = await runProspectingAgentReview({ prospects: LIST, client });
    expect(review.planner).toBe('model');
    expect(review.actions.map((a) => a.outcome)).toEqual(['rejected', 'lifted']);
    expect(review.after.map((b) => b.name)).toEqual(['Brand 1', 'Brand 2', 'Brand 3', 'Brand 6', 'Brand 4']);
    expect(bodies).toHaveLength(3);
    expect(review.modelUsage).toEqual({ calls: 3, promptTokens: 300, completionTokens: 60 });
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

  it('lists only the moves the guardrail would accept, widest rank gap first', () => {
    const eligible = eligibleReviewLifts(reviewShortlist(LIST));
    expect(eligible.map((e) => `${e.name}>${e.aboveName}`)).toEqual([
      'Brand 3>Brand 2',
      'Brand 6>Brand 5',
      'Brand 6>Brand 4',
      'Brand 6>Brand 2',
    ]);
    for (const e of eligible) {
      expect(applyReviewLift(LIST, { entityId: e.entityId, aboveEntityId: e.aboveEntityId, reason: 'x' }).ok).toBe(true);
    }
  });

  it('skips the model call entirely when no move is eligible', async () => {
    const all = [pack(1, 1), pack(2, 1), pack(3, 1), pack(4, 1), pack(5, 1), pack(6, 2)];
    const nextTurn = vi.fn();
    expect(eligibleReviewLifts(reviewShortlist(all))).toEqual([]);
    const { review } = await runProspectingAgentReview({
      prospects: all,
      client: { kind: 'model', nextTurn } as unknown as ProspectingReviewClient,
    });
    expect(nextTurn).not.toHaveBeenCalled();
    expect(review.eligibleLifts).toBe(0);
    expect(review.changed).toBe(false);
  });

  it('records a model decline with its reason and keeps the order', async () => {
    const responses = [
      {
        content: null,
        tool_calls: [
          { id: 'd1', type: 'function', function: { name: 'decline_lift', arguments: JSON.stringify({ entityId: ID(3), aboveEntityId: ID(2), reason: 'One overlap is thin evidence.' }) } },
        ],
      },
      { content: 'Done.', tool_calls: undefined },
    ];
    const bodies: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: string }) => {
        bodies.push(init.body);
        return new Response(
          JSON.stringify({ choices: [{ message: responses.shift()! }], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
          { status: 200 }
        );
      })
    );
    const { review } = await runProspectingAgentReview({
      prospects: LIST,
      client: new OpenAiProspectingReviewClient('k', 'gpt-4o-mini'),
    });
    expect(bodies[0]).toContain('eligibleLifts');
    expect(review.eligibleLifts).toBe(4);
    expect(review.changed).toBe(false);
    expect(review.actions).toHaveLength(1);
    expect(review.actions[0]).toMatchObject({ outcome: 'declined', reason: 'One overlap is thin evidence.' });
    expect(review.actions[0]!.resultSummary).toBe('Kept Brand 2 above Brand 3.');
    expect(review.summary).toMatch(/declined/);
  });
});
