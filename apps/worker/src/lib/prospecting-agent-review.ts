import type { ProspectPack } from '@leaseup/contracts';
import { matchDemoFixtureId } from '@leaseup/fixtures/worker';
import type { Env } from '../index';
import { displayBrandName } from './brand-display';
import { withTimeout } from './analysis-step-budget';

/**
 * Review after ranking: the planner sees the ranked shortlist with the evidence the
 * pipeline already gathered (verified local audience overlap, nearest store) and may lift
 * an evidence-backed pitch above a top-five pitch that has none. Every lift is validated
 * on the server. No Qloo calls; the model path uses gpt-4o-mini only.
 */

export const PROSPECTING_REVIEW_SHORTLIST = 8;
export const PROSPECTING_REVIEW_TOP = 5;
export const PROSPECTING_REVIEW_MAX_LIFTS = 2;
export const PROSPECTING_REVIEW_MAX_TURNS = 3;
export const PROSPECTING_REVIEW_TIMEOUT_MS = 10_000;

export type ProspectingReviewPlanner = 'model' | 'rule';

export type ProspectingReviewBrand = {
  entityId: string;
  name: string;
};

export type ProspectingReviewAction = {
  planner: ProspectingReviewPlanner;
  tool: 'lift_pitch';
  entityId: string;
  brandName: string;
  aboveEntityId: string;
  aboveBrandName: string;
  reason: string;
  outcome: 'lifted' | 'rejected';
  resultSummary: string;
};

export type ProspectingReviewResult = {
  planner: ProspectingReviewPlanner;
  actions: ProspectingReviewAction[];
  before: ProspectingReviewBrand[];
  after: ProspectingReviewBrand[];
  changed: boolean;
  summary: string;
  fallbackReason?: string;
};

export type ProspectingReviewLiftRequest = {
  entityId: string;
  aboveEntityId: string;
  reason: string;
};

export type ProspectingReviewTurn = {
  lifts: Array<ProspectingReviewLiftRequest & { toolCallId?: string }>;
  done: boolean;
};

export type ProspectingReviewShortlistRow = {
  rank: number;
  entityId: string;
  name: string;
  localAudienceOverlaps: string[];
  nearestStoreKm?: number;
};

export interface ProspectingReviewClient {
  readonly kind: ProspectingReviewPlanner;
  nextTurn(input: {
    shortlist: ProspectingReviewShortlistRow[];
    actionsSoFar: ProspectingReviewAction[];
    neighborhood?: string;
  }): Promise<ProspectingReviewTurn>;
  recordResults?(rows: Array<{ toolCallId: string; summary: string }>): void;
}

function packName(pack: ProspectPack): string {
  return displayBrandName(pack.brand.entityId, pack.brand.name);
}

function audienceNames(pack: ProspectPack): string[] {
  return (pack.tradeAreaTaste?.audiences ?? []).map((a) => a.name).filter(Boolean);
}

export function reviewShortlist(prospects: ProspectPack[]): ProspectingReviewShortlistRow[] {
  return prospects.slice(0, PROSPECTING_REVIEW_SHORTLIST).map((pack, index) => ({
    rank: index + 1,
    entityId: pack.brand.entityId,
    name: packName(pack),
    localAudienceOverlaps: audienceNames(pack),
    nearestStoreKm:
      pack.nearestExistingStoreKm !== undefined
        ? Math.round(pack.nearestExistingStoreKm * 10) / 10
        : undefined,
  }));
}

function topBrands(prospects: ProspectPack[]): ProspectingReviewBrand[] {
  return prospects
    .slice(0, PROSPECTING_REVIEW_TOP)
    .map((p) => ({ entityId: p.brand.entityId, name: packName(p) }));
}

function overlapPhrase(count: number): string {
  return `${count} verified local audience overlap${count === 1 ? '' : 's'}`;
}

/**
 * Server-side guardrail for one lift. Allowed only when the lifted pitch has verified local
 * audience overlap, the displaced pitch has none, the displaced pitch is in the top five,
 * and the lifted pitch currently ranks below it in the shortlist.
 */
export function applyReviewLift(
  prospects: ProspectPack[],
  request: ProspectingReviewLiftRequest
): { prospects: ProspectPack[]; ok: boolean; summary: string } {
  const shortlist = prospects.slice(0, PROSPECTING_REVIEW_SHORTLIST);
  const from = shortlist.findIndex((p) => p.brand.entityId === request.entityId);
  const to = shortlist.findIndex((p) => p.brand.entityId === request.aboveEntityId);
  if (from < 0 || to < 0) {
    return { prospects, ok: false, summary: 'Not lifted: both brands must be on the ranked shortlist.' };
  }
  const lifted = shortlist[from]!;
  const displaced = shortlist[to]!;
  const liftedOverlaps = audienceNames(lifted).length;
  const displacedOverlaps = audienceNames(displaced).length;
  if (to >= PROSPECTING_REVIEW_TOP) {
    return { prospects, ok: false, summary: 'Not lifted: the displaced brand is outside the top 5.' };
  }
  if (from <= to) {
    return { prospects, ok: false, summary: `Not lifted: ${packName(lifted)} already ranks above ${packName(displaced)}.` };
  }
  if (liftedOverlaps === 0) {
    return { prospects, ok: false, summary: `Not lifted: ${packName(lifted)} has no verified local audience overlap.` };
  }
  if (displacedOverlaps > 0) {
    return {
      prospects,
      ok: false,
      summary: `Not lifted: ${packName(displaced)} already has ${overlapPhrase(displacedOverlaps)}.`,
    };
  }
  const next = [...prospects];
  next.splice(from, 1);
  next.splice(to, 0, lifted);
  return {
    prospects: next,
    ok: true,
    summary: `${packName(lifted)} moved from #${from + 1} to #${to + 1} (${overlapPhrase(liftedOverlaps)}); ${packName(displaced)} has none.`,
  };
}

/** Deterministic reviewer for demo chips, tests, and servers without OpenAI. */
export class RuleProspectingReviewClient implements ProspectingReviewClient {
  readonly kind = 'rule' as const;
  private turn = 0;

  async nextTurn(input: { shortlist: ProspectingReviewShortlistRow[] }): Promise<ProspectingReviewTurn> {
    if (this.turn > 0) return { lifts: [], done: true };
    this.turn += 1;
    const top = input.shortlist.slice(0, PROSPECTING_REVIEW_TOP);
    const displaced = top.find((row) => row.rank > 1 && row.localAudienceOverlaps.length === 0);
    if (!displaced) return { lifts: [], done: true };
    const candidate = input.shortlist.find(
      (row) => row.rank > displaced.rank && row.localAudienceOverlaps.length > 0
    );
    if (!candidate) return { lifts: [], done: true };
    return {
      lifts: [
        {
          entityId: candidate.entityId,
          aboveEntityId: displaced.entityId,
          reason: `Rule: put a pitch with local audience evidence (${candidate.name}) ahead of one without (${displaced.name}).`,
        },
      ],
      done: false,
    };
  }
}

type ReviewChatMessage =
  | { role: 'system' | 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
    }
  | { role: 'tool'; tool_call_id: string; content: string };

const REVIEW_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'lift_pitch',
      description:
        'Move one shortlisted brand with verified local audience overlap directly above a top-5 brand that has none.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'One short sentence a leasing broker would accept.' },
          entityId: { type: 'string', description: 'Brand to lift (from the shortlist).' },
          aboveEntityId: { type: 'string', description: 'Top-5 brand it should rank above.' },
        },
        required: ['reason', 'entityId', 'aboveEntityId'],
      },
    },
  },
];

export class OpenAiProspectingReviewClient implements ProspectingReviewClient {
  readonly kind = 'model' as const;
  private readonly messages: ReviewChatMessage[] = [];
  private seeded = false;

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  recordResults(rows: Array<{ toolCallId: string; summary: string }>): void {
    for (const row of rows) {
      this.messages.push({ role: 'tool', tool_call_id: row.toolCallId, content: row.summary });
    }
  }

  async nextTurn(input: {
    shortlist: ProspectingReviewShortlistRow[];
    neighborhood?: string;
  }): Promise<ProspectingReviewTurn> {
    if (!this.seeded) {
      this.seeded = true;
      this.messages.push({
        role: 'system',
        content: [
          'You review a ranked shortlist of retail brands to pitch for one storefront.',
          'The order comes from a backtested ranking; change it only when it makes the top 5 easier to pitch.',
          `You may call lift_pitch at most ${PROSPECTING_REVIEW_MAX_LIFTS} times.`,
          'A lift is only accepted when the lifted brand has verified local audience overlap and the brand it passes, inside the top 5, has none.',
          'Always give a short reason. Reply with no tool calls when the order is fine.',
        ].join(' '),
      });
      this.messages.push({
        role: 'user',
        content: JSON.stringify({ neighborhood: input.neighborhood, shortlist: input.shortlist }),
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: this.messages,
        tools: REVIEW_TOOLS,
        temperature: 0.2,
        max_tokens: 300,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI review error: ${response.status}`);
    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content?: string | null;
          tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
        };
      }>;
    };
    const msg = data.choices[0]!.message;
    this.messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls });

    const lifts: ProspectingReviewTurn['lifts'] = [];
    for (const tc of msg.tool_calls ?? []) {
      if (tc.function.name !== 'lift_pitch') continue;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      lifts.push({
        toolCallId: tc.id,
        entityId: String(parsed.entityId ?? ''),
        aboveEntityId: String(parsed.aboveEntityId ?? ''),
        reason: String(parsed.reason ?? msg.content ?? 'Model chose this lift'),
      });
    }
    return { lifts, done: lifts.length === 0 };
  }
}

export function createProspectingReviewClient(
  env: Env,
  fixtureAddress: string
): ProspectingReviewClient {
  const apiKey = env.OPENAI_API_KEY || '';
  if (env.APP_MODE === 'live' && apiKey && !matchDemoFixtureId(fixtureAddress)) {
    return new OpenAiProspectingReviewClient(apiKey, env.OPENAI_MODEL || 'gpt-4o-mini');
  }
  return new RuleProspectingReviewClient();
}

function sameOrder(a: ProspectingReviewBrand[], b: ProspectingReviewBrand[]): boolean {
  return a.length === b.length && a.every((row, i) => row.entityId === b[i]?.entityId);
}

function reviewSummary(actions: ProspectingReviewAction[], changed: boolean): string {
  const lifted = actions.filter((a) => a.outcome === 'lifted').length;
  const rejected = actions.length - lifted;
  if (!changed) {
    return rejected > 0
      ? `Review kept the ranked top 5 (${rejected} proposed change${rejected === 1 ? '' : 's'} rejected by the evidence check).`
      : 'Review kept the ranked top 5.';
  }
  return `Review changed the top 5 with ${lifted} evidence-backed lift${lifted === 1 ? '' : 's'}.`;
}

export async function runProspectingAgentReview(params: {
  prospects: ProspectPack[];
  client: ProspectingReviewClient;
  neighborhood?: string;
}): Promise<{ prospects: ProspectPack[]; review: ProspectingReviewResult }> {
  const before = topBrands(params.prospects);
  let current = params.prospects;
  const actions: ProspectingReviewAction[] = [];
  let planner: ProspectingReviewPlanner = params.client.kind;
  let fallbackReason: string | undefined;

  const loop = async (client: ProspectingReviewClient) => {
    for (let turnIndex = 0; turnIndex < PROSPECTING_REVIEW_MAX_TURNS; turnIndex++) {
      const turn = await client.nextTurn({
        shortlist: reviewShortlist(current),
        actionsSoFar: actions,
        neighborhood: params.neighborhood,
      });
      if (turn.done || turn.lifts.length === 0) break;
      const results: Array<{ toolCallId: string; summary: string }> = [];
      for (const lift of turn.lifts) {
        const used = actions.filter((a) => a.outcome === 'lifted').length;
        const names = reviewShortlist(current);
        const liftedName = names.find((r) => r.entityId === lift.entityId)?.name ?? 'Unknown brand';
        const aboveName = names.find((r) => r.entityId === lift.aboveEntityId)?.name ?? 'Unknown brand';
        const applied =
          used >= PROSPECTING_REVIEW_MAX_LIFTS
            ? { prospects: current, ok: false, summary: 'Not lifted: review lift budget used.' }
            : applyReviewLift(current, lift);
        current = applied.prospects;
        actions.push({
          planner: client.kind,
          tool: 'lift_pitch',
          entityId: lift.entityId,
          brandName: liftedName,
          aboveEntityId: lift.aboveEntityId,
          aboveBrandName: aboveName,
          reason: lift.reason,
          outcome: applied.ok ? 'lifted' : 'rejected',
          resultSummary: applied.summary,
        });
        if (lift.toolCallId) results.push({ toolCallId: lift.toolCallId, summary: applied.summary });
      }
      client.recordResults?.(results);
    }
  };

  try {
    await withTimeout(loop(params.client), PROSPECTING_REVIEW_TIMEOUT_MS, 'prospecting review');
  } catch (err) {
    if (params.client.kind === 'model') {
      fallbackReason = (err as Error).message;
      current = params.prospects;
      actions.length = 0;
      planner = 'rule';
      await loop(new RuleProspectingReviewClient());
    } else {
      throw err;
    }
  }

  const after = topBrands(current);
  const changed = !sameOrder(before, after);
  return {
    prospects: current,
    review: {
      planner,
      actions,
      before,
      after,
      changed,
      summary: reviewSummary(actions, changed),
      ...(fallbackReason ? { fallbackReason } : {}),
    },
  };
}
