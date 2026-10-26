import type { ProspectPack } from '@leaseup/contracts';
import type { Env } from '../index';
import { displayBrandName } from './brand-display';
import { withTimeout } from './analysis-step-budget';
import { panelMarketShare } from './taste-twins';

/**
 * Review after ranking: the server lists every lift the evidence check would allow (a
 * shortlisted brand with verified local audience overlap ranked below a top-five brand that
 * was checked and has none). Each eligible lift carries a second, independent source: how the
 * two brands trade in comparable markets (the site's Qloo taste twins and the 40 market panel).
 * The reviewer accepts or declines each lift with a reason; both decisions are logged. Every
 * lift is still validated on the server. When no lift is eligible the model is not called.
 * No Qloo calls; the model path uses gpt-4o-mini only. Backtest:
 * data/qloo-eval-40/REVIEW_JUDGMENT_BACKTEST.md.
 */

export const PROSPECTING_REVIEW_SHORTLIST = 8;
export const PROSPECTING_REVIEW_TOP = 5;
export const PROSPECTING_REVIEW_MAX_LIFTS = 2;
export const PROSPECTING_REVIEW_MAX_TURNS = 3;
export const PROSPECTING_REVIEW_TIMEOUT_MS = 10_000;
/** Most eligible lifts shown to the reviewer in one run. */
export const PROSPECTING_REVIEW_MAX_ELIGIBLE = 6;

export type ProspectingReviewPlanner = 'model' | 'rule';

export type ProspectingReviewBrand = {
  entityId: string;
  name: string;
};

export type ProspectingReviewAction = {
  planner: ProspectingReviewPlanner;
  tool: 'lift_pitch' | 'decline_lift';
  entityId: string;
  brandName: string;
  aboveEntityId: string;
  aboveBrandName: string;
  reason: string;
  /** lifted: applied; rejected: blocked by the evidence check; declined: reviewer kept the order. */
  outcome: 'lifted' | 'rejected' | 'declined';
  resultSummary: string;
};

/** A lift the server evidence check would accept, offered to the reviewer to accept or decline. */
export type ProspectingReviewEligibleLift = {
  entityId: string;
  name: string;
  fromRank: number;
  localAudienceOverlaps: string[];
  aboveEntityId: string;
  aboveName: string;
  aboveRank: number;
  /** Comparable market evidence for both brands; absent fields mean the brand is outside the panel. */
  comparableMarkets: {
    lifted: ProspectingReviewComparable;
    displaced: ProspectingReviewComparable;
  };
};

/** How a brand trades in comparable markets: taste twins with a store, and the panel market share. */
export type ProspectingReviewComparable = {
  twinMarketsWithStore?: number;
  twinMarkets?: number;
  panelMarketShare?: number;
};

/** How far below the displaced brand's panel market share a lifted brand may be and still move up. */
/** Ends a sentence once, so a name like "Tiffany & Co." does not get a second period. */
export function endSentence(text: string): string {
  return text.endsWith('.') ? text : `${text}.`;
}

function sharePct(value: string): string {
  return `${Math.round(Number(value) * 100)}%`;
}

/**
 * The model reasons with the tool field names; brokers read the reason, so field names and
 * 0 to 1 shares become plain words and percentages. Wording only: the numbers are unchanged.
 */
export function plainReviewReason(reason: string): string {
  return reason
    .replace(/\bpanelMarketShare\b(?: of| is| =|:)? ?(0?\.\d+|1(?:\.0+)?|0)\b/g, (_m, v: string) =>
      `share of panel markets (${sharePct(v)})`
    )
    .replace(/(\d?\.\d+|\b[01]\b) minus 0?\.10?\b/g, (_m, v: string) => `${sharePct(v)} minus 10 points`)
    .replace(/\bpanelMarketShare\b/g, 'share of panel markets')
    .replace(/\btwinMarketsWithStore\b/g, 'taste twin markets with a store')
    .replace(/\btwinMarkets\b/g, 'taste twin markets')
    .replace(/\bcomparableMarkets\b/g, 'comparable markets')
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

export const REVIEW_PANEL_SHARE_MARGIN = 0.1;

/**
 * supports: the lifted brand has a store in at least the displaced brand's share of panel markets,
 * less a 10 point margin; weaker: further below; unknown: either brand is outside the panel. Chosen
 * by leave one market out selection, see data/qloo-eval-40/REVIEW_JUDGMENT_BACKTEST.md.
 */
export type ComparableMarketsVerdict = 'supports' | 'weaker' | 'unknown';

export function comparableMarketsVerdict(
  lift: Pick<ProspectingReviewEligibleLift, 'comparableMarkets'>
): ComparableMarketsVerdict {
  const a = lift.comparableMarkets.lifted.panelMarketShare;
  const b = lift.comparableMarkets.displaced.panelMarketShare;
  if (a === undefined || b === undefined) return 'unknown';
  return a + 1e-9 >= b - REVIEW_PANEL_SHARE_MARGIN ? 'supports' : 'weaker';
}

export type ProspectingReviewModelUsage = {
  calls: number;
  promptTokens: number;
  completionTokens: number;
};

/** Final top 5 compared with the standard ranking (blended rank order, no planner or review). */
export type ProspectingReviewOutcome = {
  standardTop5: ProspectingReviewBrand[];
  finalTop5: ProspectingReviewBrand[];
  top3Changed: boolean;
  top5Changed: boolean;
  enteredTop5: string[];
  leftTop5: string[];
  summary: string;
};

export type ProspectingReviewResult = {
  planner: ProspectingReviewPlanner;
  actions: ProspectingReviewAction[];
  before: ProspectingReviewBrand[];
  after: ProspectingReviewBrand[];
  changed: boolean;
  summary: string;
  /** Lifts the evidence check allowed on the ranked shortlist before review (0 means nothing to decide). */
  eligibleLifts?: number;
  fallbackReason?: string;
  modelUsage?: ProspectingReviewModelUsage;
  outcome: ProspectingReviewOutcome;
};

export type ProspectingReviewLiftRequest = {
  entityId: string;
  aboveEntityId: string;
  reason: string;
};

export type ProspectingReviewTurn = {
  lifts: Array<ProspectingReviewLiftRequest & { toolCallId?: string }>;
  declines?: Array<ProspectingReviewLiftRequest & { toolCallId?: string }>;
  done: boolean;
};

export type ProspectingReviewShortlistRow = {
  rank: number;
  entityId: string;
  name: string;
  localAudienceOverlaps: string[];
  /** overlap: verified overlap; none: checked, no overlap; unchecked: not recorded or Qloo unavailable. */
  audienceCheck: ProspectingReviewAudienceCheck;
  nearestStoreKm?: number;
  /** Of this site's taste twins, how many have a store for the brand. */
  twinMarketsWithStore?: number;
  twinMarkets?: number;
  /** Share of panel markets over 50 km away with a store for the brand (2 decimals). */
  panelMarketShare?: number;
};

export type ProspectingReviewLocation = { latitude: number; longitude: number };

export type ProspectingReviewAudienceCheck = 'overlap' | 'none' | 'unchecked';

export interface ProspectingReviewClient {
  readonly kind: ProspectingReviewPlanner;
  nextTurn(input: {
    shortlist: ProspectingReviewShortlistRow[];
    eligibleLifts: ProspectingReviewEligibleLift[];
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

function audienceCheck(pack: ProspectPack): ProspectingReviewAudienceCheck {
  if (audienceNames(pack).length > 0) return 'overlap';
  return pack.tradeAreaTasteChecked === true ? 'none' : 'unchecked';
}

export function reviewShortlist(
  prospects: ProspectPack[],
  location?: ProspectingReviewLocation
): ProspectingReviewShortlistRow[] {
  return prospects.slice(0, PROSPECTING_REVIEW_SHORTLIST).map((pack, index) => {
    const share = location
      ? panelMarketShare(pack.brand.entityId, location.latitude, location.longitude)
      : undefined;
    return {
      rank: index + 1,
      entityId: pack.brand.entityId,
      name: packName(pack),
      localAudienceOverlaps: audienceNames(pack),
      audienceCheck: audienceCheck(pack),
      nearestStoreKm:
        pack.nearestExistingStoreKm !== undefined
          ? Math.round(pack.nearestExistingStoreKm * 10) / 10
          : undefined,
      ...(pack.tasteTwins
        ? { twinMarketsWithStore: pack.tasteTwins.presentIn, twinMarkets: pack.tasteTwins.of }
        : {}),
      ...(share !== undefined ? { panelMarketShare: Math.round(share * 100) / 100 } : {}),
    };
  });
}

function comparable(row: ProspectingReviewShortlistRow): ProspectingReviewComparable {
  return {
    ...(row.twinMarketsWithStore !== undefined
      ? { twinMarketsWithStore: row.twinMarketsWithStore, twinMarkets: row.twinMarkets }
      : {}),
    ...(row.panelMarketShare !== undefined ? { panelMarketShare: row.panelMarketShare } : {}),
  };
}

/**
 * Every lift the server guardrail (`applyReviewLift`) would accept on this shortlist, nearest
 * pairs first. Uses the same rules: displaced brand in the top 5, checked, no overlap; lifted
 * brand below it on the shortlist with at least one verified overlap.
 */
export function eligibleReviewLifts(
  shortlist: ProspectingReviewShortlistRow[]
): ProspectingReviewEligibleLift[] {
  const out: ProspectingReviewEligibleLift[] = [];
  for (const above of shortlist.slice(0, PROSPECTING_REVIEW_TOP)) {
    if (above.audienceCheck !== 'none') continue;
    for (const row of shortlist) {
      if (row.rank <= above.rank || row.localAudienceOverlaps.length === 0) continue;
      out.push({
        entityId: row.entityId,
        name: row.name,
        fromRank: row.rank,
        localAudienceOverlaps: row.localAudienceOverlaps,
        aboveEntityId: above.entityId,
        aboveName: above.name,
        aboveRank: above.rank,
        comparableMarkets: { lifted: comparable(row), displaced: comparable(above) },
      });
    }
  }
  return out
    .sort((a, b) => a.fromRank - a.aboveRank - (b.fromRank - b.aboveRank) || a.aboveRank - b.aboveRank)
    .slice(0, PROSPECTING_REVIEW_MAX_ELIGIBLE);
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
 * audience overlap, the displaced pitch was checked and has none (never when its overlap is
 * unknown), the displaced pitch is in the top five, and the lifted pitch ranks below it.
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
    return { prospects, ok: false, summary: endSentence(`Not lifted: ${packName(lifted)} already ranks above ${packName(displaced)}`) };
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
  if (displaced.tradeAreaTasteChecked !== true) {
    return {
      prospects,
      ok: false,
      summary: `Not lifted: local audience overlap for ${packName(displaced)} was not checked, so it is unknown.`,
    };
  }
  const next = [...prospects];
  next.splice(from, 1);
  next.splice(to, 0, lifted);
  return {
    prospects: next,
    ok: true,
    summary: `${packName(lifted)} moved from #${from + 1} to #${to + 1} (${overlapPhrase(liftedOverlaps)}); ${packName(displaced)} was checked and has none.`,
  };
}

function pct(share: number | undefined): string {
  return share === undefined ? 'unknown' : `${Math.round(share * 100)}%`;
}

function twinsPhrase(c: ProspectingReviewComparable): string {
  return c.twinMarketsWithStore === undefined ? 'an unknown number of' : `${c.twinMarketsWithStore} of ${c.twinMarkets ?? 5}`;
}

/** One sentence with the comparable market numbers for both brands. */
export function comparableMarketsReason(lift: ProspectingReviewEligibleLift): string {
  const a = lift.comparableMarkets.lifted;
  const b = lift.comparableMarkets.displaced;
  const facts = `${lift.name} has a store in ${pct(a.panelMarketShare)} of panel markets and ${twinsPhrase(a)} taste twins; ${lift.aboveName} in ${pct(b.panelMarketShare)} and ${twinsPhrase(b)}`;
  switch (comparableMarketsVerdict(lift)) {
    case 'supports':
      return `Rule: lift; local audience overlap and comparable markets agree (${facts}).`;
    case 'weaker':
      return `Rule: keep the order; overlap alone is weak and ${lift.name} trades in fewer comparable markets (${facts}).`;
    default:
      return `Rule: keep the order; comparable market data is missing, so overlap alone is not enough (${facts}).`;
  }
}

/**
 * Deterministic reviewer for demo mode, tests, servers without OpenAI, and model fallback. Lifts an
 * eligible pitch only when comparable markets support it and declines the rest with the numbers.
 */
export class RuleProspectingReviewClient implements ProspectingReviewClient {
  readonly kind = 'rule' as const;
  /** Pairs already proposed or declined, so a rejected lift is never retried and each decline is said once. */
  private readonly seen = new Set<string>();

  async nextTurn(input: { eligibleLifts: ProspectingReviewEligibleLift[] }): Promise<ProspectingReviewTurn> {
    const lifts: ProspectingReviewTurn['lifts'] = [];
    const declines: NonNullable<ProspectingReviewTurn['declines']> = [];
    for (const lift of input.eligibleLifts) {
      const key = `${lift.entityId}>${lift.aboveEntityId}`;
      if (this.seen.has(key)) continue;
      const row = { entityId: lift.entityId, aboveEntityId: lift.aboveEntityId, reason: comparableMarketsReason(lift) };
      const verdict = comparableMarketsVerdict(lift);
      // One lift per turn, so the next turn sees the updated ranks.
      if (verdict === 'supports' && lifts.length === 0) {
        lifts.push(row);
        this.seen.add(key);
      } else if (verdict !== 'supports') {
        declines.push(row);
        this.seen.add(key);
      }
    }
    return { lifts, declines, done: lifts.length === 0 };
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
  {
    type: 'function' as const,
    function: {
      name: 'decline_lift',
      description: 'Keep the ranked order for one eligible lift, with the reason it should not move.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'One short sentence citing the evidence.' },
          entityId: { type: 'string', description: 'Brand that would have been lifted.' },
          aboveEntityId: { type: 'string', description: 'Top-5 brand that keeps its place.' },
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
  readonly usage: ProspectingReviewModelUsage = { calls: 0, promptTokens: 0, completionTokens: 0 };

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
    eligibleLifts: ProspectingReviewEligibleLift[];
    neighborhood?: string;
  }): Promise<ProspectingReviewTurn> {
    if (!this.seeded) {
      this.seeded = true;
      this.messages.push({
        role: 'system',
        content: [
          'You review a ranked shortlist of retail brands a leasing broker will pitch for one storefront.',
          'The order comes from a ranking of Qloo brand taste fit, chain size and taste twin presence.',
          'eligibleLifts lists every move the server evidence check allows: a brand with verified Qloo local audience overlap ranked below a top-5 brand that was checked and has none.',
          'Each eligible lift also gives comparableMarkets for both brands: panelMarketShare (share of the 40 panel markets over 50 km away with a store) and twinMarketsWithStore of twinMarkets (this site\'s taste twins, the panel markets with the closest Qloo taste, that have a store).',
          'Overlap alone is weak evidence. In a 40 market backtest, lifts where the lower brand\'s panelMarketShare was at least the displaced brand\'s minus 0.10 gained a top 5 hit more than twice as often as they lost one; lifts further below broke even, and taking only the backed lifts beat taking every lift.',
          'So call lift_pitch only when the lifted panelMarketShare is at least the displaced panelMarketShare minus 0.10; otherwise call decline_lift. If either panelMarketShare is missing, decline. Twin counts explain the call; they do not override that test.',
          `Decide every eligible lift in one turn. At most ${PROSPECTING_REVIEW_MAX_LIFTS} lifts are applied. Every reason is one short sentence that cites the comparable numbers for both brands. Never propose a move that is not in eligibleLifts.`,
        ].join(' '),
      });
      this.messages.push({
        role: 'user',
        content: JSON.stringify({
          neighborhood: input.neighborhood,
          shortlist: input.shortlist,
          eligibleLifts: input.eligibleLifts,
        }),
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
        max_tokens: 700,
      }),
    });
    this.usage.calls += 1;
    if (!response.ok) throw new Error(`OpenAI review error: ${response.status}`);
    const data = (await response.json()) as {
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      choices: Array<{
        message: {
          content?: string | null;
          tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
        };
      }>;
    };
    this.usage.promptTokens += data.usage?.prompt_tokens ?? 0;
    this.usage.completionTokens += data.usage?.completion_tokens ?? 0;
    const msg = data.choices[0]!.message;
    this.messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls });

    const lifts: ProspectingReviewTurn['lifts'] = [];
    const declines: NonNullable<ProspectingReviewTurn['declines']> = [];
    for (const tc of msg.tool_calls ?? []) {
      const name = tc.function.name;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      const row = {
        toolCallId: tc.id,
        entityId: String(parsed.entityId ?? ''),
        aboveEntityId: String(parsed.aboveEntityId ?? ''),
        reason: plainReviewReason(String(parsed.reason ?? msg.content ?? '')),
      };
      if (name === 'lift_pitch') lifts.push({ ...row, reason: row.reason || 'Model chose this lift' });
      else if (name === 'decline_lift') declines.push({ ...row, reason: row.reason || 'Model kept the order' });
      else this.messages.push({ role: 'tool', tool_call_id: tc.id, content: 'Unknown tool.' });
    }
    return { lifts, declines, done: lifts.length === 0 };
  }
}

/** Live runs (demo chips included) use the gpt-4o-mini reviewer; demo mode and keyless servers use the rule. */
export function createProspectingReviewClient(env: Env): ProspectingReviewClient {
  const apiKey = env.OPENAI_API_KEY || '';
  if (env.APP_MODE === 'live' && apiKey) {
    return new OpenAiProspectingReviewClient(apiKey, env.OPENAI_MODEL || 'gpt-4o-mini');
  }
  return new RuleProspectingReviewClient();
}

function sameOrder(a: ProspectingReviewBrand[], b: ProspectingReviewBrand[]): boolean {
  return a.length === b.length && a.every((row, i) => row.entityId === b[i]?.entityId);
}

function standardTop5(prospects: ProspectPack[]): ProspectingReviewBrand[] {
  return prospects
    .map((p, index) => ({ p, index }))
    .sort((a, b) => a.p.brand.affinityRank - b.p.brand.affinityRank || a.index - b.index)
    .slice(0, PROSPECTING_REVIEW_TOP)
    .map(({ p }) => ({ entityId: p.brand.entityId, name: packName(p) }));
}

export function reviewOutcome(
  standard: ProspectingReviewBrand[],
  final: ProspectingReviewBrand[]
): ProspectingReviewOutcome {
  const ids = (rows: ProspectingReviewBrand[]) => rows.map((r) => r.entityId);
  const top3Changed = !sameOrder(standard.slice(0, 3), final.slice(0, 3));
  const top5Changed = !sameOrder(standard, final);
  const enteredTop5 = final.filter((r) => !ids(standard).includes(r.entityId)).map((r) => r.name);
  const leftTop5 = standard.filter((r) => !ids(final).includes(r.entityId)).map((r) => r.name);
  let summary = 'Same top 5 as the standard ranking.';
  if (top5Changed) {
    const moved = final
      .map((r, i) => ({ r, i, s: ids(standard).indexOf(r.entityId) }))
      .filter(({ i, s }) => s !== i)
      .map(({ r, i, s }) => (s < 0 ? `${r.name} new at #${i + 1}` : `${r.name} #${s + 1} to #${i + 1}`));
    summary = `Changed vs the standard ranking: ${moved.join('; ')}.`;
  }
  return { standardTop5: standard, finalTop5: final, top3Changed, top5Changed, enteredTop5, leftTop5, summary };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function reviewSummary(actions: ProspectingReviewAction[], changed: boolean, eligible: number): string {
  const lifted = actions.filter((a) => a.outcome === 'lifted').length;
  const rejected = actions.filter((a) => a.outcome === 'rejected').length;
  const declined = actions.filter((a) => a.outcome === 'declined').length;
  if (eligible === 0 && actions.length === 0) {
    return 'Review kept the ranked top 5: no lift passes the evidence check.';
  }
  const notes: string[] = [];
  if (actions.length === 0) notes.push(`${plural(eligible, 'eligible lift')}, no decision returned`);
  if (declined > 0) notes.push(`${plural(declined, 'eligible lift')} declined with a reason`);
  if (rejected > 0) notes.push(`${plural(rejected, 'proposed change')} rejected by the evidence check`);
  const tail = notes.length ? ` (${notes.join('; ')})` : '';
  if (!changed) return `Review kept the ranked top 5${tail}.`;
  return `Review changed the top 5 with ${plural(lifted, 'evidence-backed lift')}${tail}.`;
}

export async function runProspectingAgentReview(params: {
  prospects: ProspectPack[];
  client: ProspectingReviewClient;
  neighborhood?: string;
  /** Site pin, used for the panel market share (markets within 50 km are left out). */
  location?: ProspectingReviewLocation;
}): Promise<{ prospects: ProspectPack[]; review: ProspectingReviewResult }> {
  const before = topBrands(params.prospects);
  const standard = standardTop5(params.prospects);
  let current = params.prospects;
  const actions: ProspectingReviewAction[] = [];
  let planner: ProspectingReviewPlanner = params.client.kind;
  let fallbackReason: string | undefined;

  const eligibleAtStart = eligibleReviewLifts(reviewShortlist(params.prospects, params.location)).length;

  const loop = async (client: ProspectingReviewClient) => {
    for (let turnIndex = 0; turnIndex < PROSPECTING_REVIEW_MAX_TURNS; turnIndex++) {
      const shortlist = reviewShortlist(current, params.location);
      // Pairs the model already declined are not offered again.
      const declined = new Set(
        actions.filter((a) => a.outcome === 'declined').map((a) => `${a.entityId}>${a.aboveEntityId}`)
      );
      const eligibleLifts = eligibleReviewLifts(shortlist).filter(
        (e) => !declined.has(`${e.entityId}>${e.aboveEntityId}`)
      );
      // Nothing the evidence check would allow: do not spend a model call.
      if (eligibleLifts.length === 0) break;
      const turn = await client.nextTurn({
        shortlist,
        eligibleLifts,
        actionsSoFar: actions,
        neighborhood: params.neighborhood,
      });
      const results: Array<{ toolCallId: string; summary: string }> = [];
      for (const decline of turn.declines ?? []) {
        const liftedName = shortlist.find((r) => r.entityId === decline.entityId)?.name ?? 'Unknown brand';
        const aboveName = shortlist.find((r) => r.entityId === decline.aboveEntityId)?.name ?? 'Unknown brand';
        const summary = endSentence(`Kept ${aboveName} above ${liftedName}`);
        actions.push({
          planner: client.kind,
          tool: 'decline_lift',
          entityId: decline.entityId,
          brandName: liftedName,
          aboveEntityId: decline.aboveEntityId,
          aboveBrandName: aboveName,
          reason: decline.reason,
          outcome: 'declined',
          resultSummary: summary,
        });
        if (decline.toolCallId) results.push({ toolCallId: decline.toolCallId, summary });
      }
      if (turn.done || turn.lifts.length === 0) break;
      for (const lift of turn.lifts) {
        const used = actions.filter((a) => a.outcome === 'lifted').length;
        const names = reviewShortlist(current, params.location);
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
  const usage = params.client instanceof OpenAiProspectingReviewClient ? params.client.usage : undefined;
  return {
    prospects: current,
    review: {
      planner,
      actions,
      before,
      after,
      changed,
      summary: reviewSummary(actions, changed, eligibleAtStart),
      eligibleLifts: eligibleAtStart,
      ...(fallbackReason ? { fallbackReason } : {}),
      ...(usage && usage.calls > 0 ? { modelUsage: { ...usage } } : {}),
      outcome: reviewOutcome(standard, after),
    },
  };
}
