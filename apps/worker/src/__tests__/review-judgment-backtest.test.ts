import { describe, expect, it } from 'vitest';
import recorded from '../../../../data/qloo-eval-40/review_judgment_model.json';
import {
  RuleProspectingReviewClient,
  type ProspectingReviewClient,
  type ProspectingReviewEligibleLift,
} from '../lib/prospecting-agent-review';
import {
  buildReviewCases,
  ReplayReviewClient,
  runCase,
  scoreCase,
  summarize,
  TakeEveryLiftClient,
  type CaseScore,
  type RecordedTurn,
} from '../eval/review-judgment-cases';

/**
 * 40 market backtest of the prospecting review (data/qloo-eval-40/REVIEW_JUDGMENT_BACKTEST.md).
 * Every number here is recomputed on each CI run from the shipped panel and the recorded
 * gpt-4o-mini turns, through the production review loop.
 */
type Policy = (l: ProspectingReviewEligibleLift) => boolean;
function policyClient(accept: Policy): ProspectingReviewClient {
  return {
    kind: 'rule',
    async nextTurn(input) {
      const lift = input.eligibleLifts.find(accept);
      const declines = input.eligibleLifts.filter((l) => !accept(l));
      return {
        lifts: lift ? [{ entityId: lift.entityId, aboveEntityId: lift.aboveEntityId, reason: 'policy' }] : [],
        declines: declines.map((l) => ({ entityId: l.entityId, aboveEntityId: l.aboveEntityId, reason: 'policy' })),
        done: !lift,
      };
    },
  };
}
const share = (l: ProspectingReviewEligibleLift, side: 'lifted' | 'displaced') =>
  l.comparableMarkets[side].panelMarketShare;
const twins = (l: ProspectingReviewEligibleLift, side: 'lifted' | 'displaced') =>
  l.comparableMarkets[side].twinMarketsWithStore;
const margin = (m: number): Policy => (l) => {
  const a = share(l, 'lifted');
  const b = share(l, 'displaced');
  return a !== undefined && b !== undefined && a + 1e-9 >= b + m;
};
/** Candidate policies the margin was selected from, leave one market out. */
const CANDIDATES: Record<string, Policy> = {
  takeEvery: () => true,
  declineAll: () => false,
  shareMinus10: margin(-0.1),
  shareAbove: (l) => margin(0)(l) && share(l, 'lifted')! > share(l, 'displaced')!,
  sharePlus10: margin(0.1),
  twinsAtLeast: (l) => (twins(l, 'lifted') ?? -1) >= (twins(l, 'displaced') ?? 99),
  twinsAbove: (l) => (twins(l, 'lifted') ?? -1) > (twins(l, 'displaced') ?? 99),
  adjacentOnly: (l) => l.fromRank - l.aboveRank === 1,
};

async function scoreAll(make: (siteId: string) => ProspectingReviewClient): Promise<CaseScore[]> {
  const out: CaseScore[] = [];
  for (const c of buildReviewCases()) out.push(scoreCase(c, (await runCase(c, make(c.siteId))).review));
  return out;
}
const deltas = (s: CaseScore[]) => s.map((x) => x.finalHits - x.standardHits);
const cases = (recorded as unknown as { cases: Record<string, { turns: RecordedTurn[] }> }).cases;

describe('review judgment backtest (40 panel markets)', () => {
  it('taking every eligible lift is a weak positive with 8 lifts that cost a hit', async () => {
    expect(summarize(await scoreAll(() => new TakeEveryLiftClient()))).toEqual({
      markets: 40,
      meanTop5HitChange: 0.125,
      ci95: [-0.05, 0.325],
      marketsBetter: 10,
      marketsWorse: 5,
      lifts: 80,
      declines: 0,
      goodLifts: 17,
      badLifts: 8,
    });
  });

  it('the shipped rule declines lifts the panel does not back and gains more hits', async () => {
    const rule = await scoreAll(() => new RuleProspectingReviewClient());
    expect(summarize(rule)).toEqual({
      markets: 40,
      meanTop5HitChange: 0.2,
      ci95: [0.025, 0.375],
      marketsBetter: 11,
      marketsWorse: 3,
      lifts: 78,
      declines: 183,
      goodLifts: 21,
      badLifts: 5,
    });
    // Paired against taking every lift: never worse in any market.
    const take = await scoreAll(() => new TakeEveryLiftClient());
    const paired = rule.map((s, i) => ({ ...s, standardHits: take[i]!.finalHits }));
    expect(summarize(paired)).toMatchObject({ meanTop5HitChange: 0.075, ci95: [0, 0.175], marketsBetter: 3, marketsWorse: 0 });
  });

  it('leave one market out selection picks the shipped 10 point margin in every fold', async () => {
    const per: Record<string, CaseScore[]> = {};
    for (const [name, p] of Object.entries(CANDIDATES)) per[name] = await scoreAll(() => policyClient(p));
    const names = Object.keys(CANDIDATES);
    const picks: Record<string, number> = {};
    const nested: CaseScore[] = [];
    for (let t = 0; t < 40; t++) {
      let best = names[0]!;
      let bestSum = -Infinity;
      for (const name of names) {
        const sum = deltas(per[name]!).reduce((a, d, i) => a + (i === t ? 0 : d), 0);
        if (sum > bestSum + 1e-9) {
          bestSum = sum;
          best = name;
        }
      }
      picks[best] = (picks[best] ?? 0) + 1;
      nested.push(per[best]![t]!);
    }
    expect(picks).toEqual({ shareMinus10: 40 });
    expect(summarize(nested)).toMatchObject({ meanTop5HitChange: 0.2, ci95: [0.025, 0.375] });
  });

  it('replays the recorded gpt-4o-mini turns: fewer lifts, higher precision, interval touching zero', async () => {
    const model = await scoreAll((id) => new ReplayReviewClient(cases[id]?.turns ?? []));
    expect(Object.keys(cases)).toHaveLength(40);
    expect(summarize(model)).toEqual({
      markets: 40,
      meanTop5HitChange: 0.175,
      ci95: [0, 0.35],
      marketsBetter: 10,
      marketsWorse: 3,
      lifts: 46,
      declines: 48,
      goodLifts: 13,
      badLifts: 1,
    });
  });
});
