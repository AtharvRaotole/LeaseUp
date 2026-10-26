import type { ProspectPack } from '@leaseup/contracts';
import panel from '../lib/taste-twin-panel.json';
import { findTasteTwins, tasteTwinEvidence } from '../lib/taste-twins';
import { orderInsightsByTwinBlend } from '../lib/twin-rank';
import { displayBrandName } from '../lib/brand-display';
import {
  PROSPECTING_REVIEW_SHORTLIST,
  PROSPECTING_REVIEW_TOP,
  runProspectingAgentReview,
  type ProspectingReviewClient,
  type ProspectingReviewResult,
  type ProspectingReviewTurn,
} from '../lib/prospecting-agent-review';

/**
 * Offline backtest cases for the prospecting review, built only from the shipped 40 market panel.
 * For each panel market (held out): its top 50 brands by Qloo affinity (the live prospecting pool),
 * taste twins found without it, the production twin blend order, and the top 8 as review packs.
 * Local audience overlap is not recorded for these markets, so it is simulated: ranks 1 to 5 were
 * checked and have none, ranks 6 to 8 have one. That makes every in window lift eligible, which is
 * the hard case for the reviewer. Ground truth is whether the held out market has a store for the
 * brand inside its adaptive radius (the same label as TWIN_RANK_EVAL.md).
 */

type Site = { id: string; label: string; lat: number; lon: number; present: number[]; dev: Array<number | null> };
const SITES = panel.sites as Site[];
const BRANDS = panel.brands as string[];
const MEAN_Z = panel.brandMeanZ as number[];
export const LIVE_POOL = 50;
export const SIMULATED_OVERLAP = 'Simulated overlap (offline backtest)';

export type ReviewCase = {
  siteId: string;
  label: string;
  location: { latitude: number; longitude: number };
  prospects: ProspectPack[];
  present: Set<string>;
};

export function buildReviewCases(): ReviewCase[] {
  return SITES.map((site) => {
    const insights = site.dev
      .flatMap((d, i) =>
        d === null ? [] : [{ entity_id: BRANDS[i]!, name: BRANDS[i]!, query: { affinity: d + MEAN_Z[i]! } }]
      )
      .sort((a, b) => b.query.affinity - a.query.affinity || a.entity_id.localeCompare(b.entity_id))
      .slice(0, LIVE_POOL);
    const twins = findTasteTwins(site.lat, site.lon, insights, panel.k, { excludePanelIds: new Set([site.id]) });
    if (!twins) throw new Error(`no twins for ${site.id}`);
    const ordered = orderInsightsByTwinBlend(insights, twins).slice(0, PROSPECTING_REVIEW_SHORTLIST);
    const prospects = ordered.map((row, i) => {
      const overlap = i >= PROSPECTING_REVIEW_TOP;
      return {
        brand: {
          entityId: row.entity_id,
          name: displayBrandName(row.entity_id, row.entity_id),
          affinity: row.query.affinity,
          affinityRank: i + 1,
        },
        tradeAreaTasteChecked: true,
        tradeAreaTaste: overlap
          ? { tags: [], audiences: [{ entityId: 'sim', name: SIMULATED_OVERLAP, affinity: 0.5, affinityRank: 1 }] }
          : undefined,
        tasteTwins: tasteTwinEvidence(row.entity_id, twins),
        reasons: [],
      } as unknown as ProspectPack;
    });
    const present = new Set(site.present.map((i) => BRANDS[i]!));
    return { siteId: site.id, label: site.label, location: { latitude: site.lat, longitude: site.lon }, prospects, present };
  });
}

/** Lifts the first eligible move every turn: the old reviewer, which took every lift it was offered. */
export class TakeEveryLiftClient implements ProspectingReviewClient {
  readonly kind = 'rule' as const;
  async nextTurn(input: Parameters<ProspectingReviewClient['nextTurn']>[0]): Promise<ProspectingReviewTurn> {
    const first = input.eligibleLifts[0];
    if (!first) return { lifts: [], done: true };
    return { lifts: [{ entityId: first.entityId, aboveEntityId: first.aboveEntityId, reason: 'take' }], done: false };
  }
}

export type RecordedTurn = {
  lifts: Array<{ entityId: string; aboveEntityId: string; reason: string }>;
  declines: Array<{ entityId: string; aboveEntityId: string; reason: string }>;
  done: boolean;
};

/** Replays recorded model turns (data/qloo-eval-40/review_judgment_model.json) through the production loop. */
export class ReplayReviewClient implements ProspectingReviewClient {
  readonly kind = 'model' as const;
  private i = 0;
  constructor(private readonly turns: RecordedTurn[]) {}
  async nextTurn(): Promise<ProspectingReviewTurn> {
    const turn = this.turns[this.i++];
    return turn ?? { lifts: [], done: true };
  }
}

/** Wraps a client and records each turn it returns. */
export class RecordingReviewClient implements ProspectingReviewClient {
  readonly turns: RecordedTurn[] = [];
  constructor(private readonly inner: ProspectingReviewClient) {}
  get kind() {
    return this.inner.kind;
  }
  async nextTurn(input: Parameters<ProspectingReviewClient['nextTurn']>[0]): Promise<ProspectingReviewTurn> {
    const turn = await this.inner.nextTurn(input);
    const strip = (r: { entityId: string; aboveEntityId: string; reason: string }) => ({
      entityId: r.entityId,
      aboveEntityId: r.aboveEntityId,
      reason: r.reason,
    });
    this.turns.push({ lifts: turn.lifts.map(strip), declines: (turn.declines ?? []).map(strip), done: turn.done });
    return turn;
  }
  recordResults(rows: Array<{ toolCallId: string; summary: string }>): void {
    this.inner.recordResults?.(rows);
  }
}

export type CaseScore = {
  siteId: string;
  standardHits: number;
  finalHits: number;
  lifted: number;
  declined: number;
  goodLifts: number;
  badLifts: number;
};

/** Hits in the top 5 (brands the held out market already hosts) before and after review. */
export function scoreCase(c: ReviewCase, review: ProspectingReviewResult): CaseScore {
  const hits = (ids: string[]) => ids.filter((id) => c.present.has(id)).length;
  const standardHits = hits(review.outcome.standardTop5.map((b) => b.entityId));
  const finalHits = hits(review.outcome.finalTop5.map((b) => b.entityId));
  const lifts = review.actions.filter((a) => a.outcome === 'lifted');
  const gain = (a: (typeof lifts)[number]) => Number(c.present.has(a.entityId)) - Number(c.present.has(a.aboveEntityId));
  return {
    siteId: c.siteId,
    standardHits,
    finalHits,
    lifted: lifts.length,
    declined: review.actions.filter((a) => a.outcome === 'declined').length,
    goodLifts: lifts.filter((a) => gain(a) > 0).length,
    badLifts: lifts.filter((a) => gain(a) < 0).length,
  };
}

export async function runCase(c: ReviewCase, client: ProspectingReviewClient) {
  return runProspectingAgentReview({ prospects: c.prospects, client, location: c.location, neighborhood: c.label });
}

/** Mean change in top 5 hits per market, with a seeded bootstrap 95% interval over markets. */
export function summarize(scores: CaseScore[], seed = 20261026) {
  const d = scores.map((s) => s.finalHits - s.standardHits);
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  let x = seed >>> 0;
  const rand = () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
  const boots: number[] = [];
  for (let b = 0; b < 4000; b++) {
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[Math.floor(rand() * d.length)]!;
    boots.push(s / d.length);
  }
  boots.sort((a, b) => a - b);
  const sum = (k: keyof CaseScore) => scores.reduce((a, s) => a + (s[k] as number), 0);
  return {
    markets: scores.length,
    meanTop5HitChange: Math.round(mean * 1000) / 1000,
    ci95: [Math.round(boots[Math.floor(0.025 * boots.length)]! * 1000) / 1000, Math.round(boots[Math.floor(0.975 * boots.length)]! * 1000) / 1000],
    marketsBetter: d.filter((v) => v > 0).length,
    marketsWorse: d.filter((v) => v < 0).length,
    lifts: sum('lifted'),
    declines: sum('declined'),
    goodLifts: sum('goodLifts'),
    badLifts: sum('badLifts'),
  };
}
