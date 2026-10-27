# Prospecting review judgment backtest (40 panel markets)

Recomputed on every CI run by `apps/worker/src/__tests__/review-judgment-backtest.test.ts` through the production review loop (`runProspectingAgentReview`). Cases are built by `apps/worker/src/eval/review-judgment-cases.ts`.

## Setup

- One case per panel market (40), held out. Pool: its top 50 brands by Qloo affinity (the live prospecting pool). Taste twins are found without the held out market, and the order is the production twin blend.
- Review packs: the top 8 of that order. Local audience overlap is not recorded for these markets, so it is simulated: ranks 1 to 5 were checked and have none, ranks 6 to 8 have one. Every in window lift is therefore eligible, which is the hard case for a reviewer.
- Comparable markets per brand: `panelMarketShare` (share of panel markets over 50 km away with a store; the held out market is always excluded) and twin counts (taste twins with a store).
- Ground truth: whether the held out market has a store for the brand inside its adaptive radius (the same label as `TWIN_RANK_EVAL.md`).
- Metric: change in top 5 hits per market versus the order before review. 95% interval: seeded bootstrap over markets, 4000 resamples.

## Results

| Reviewer | Mean top 5 hit change | 95% interval | Markets better / worse | Lifts | Lifts that gained / lost a hit | Declines |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Take every eligible lift (deploy46 behavior) | +0.125 | [-0.05, 0.325] | 10 / 5 | 80 | 17 / 8 | 0 |
| Shipped rule (panel share margin 0.10) | +0.200 | [0.025, 0.375] | 11 / 3 | 78 | 21 / 5 | 183 |
| Rule paired against take every lift | +0.075 | [0, 0.175] | 3 / 0 | | | |
| gpt-4o-mini with the shipped prompt (recorded, replayed) | +0.175 | [0, 0.35] | 10 / 3 | 46 | 13 / 1 | 48 |

Recorded model run: `review_judgment_model.json`, 80 gpt-4o-mini calls, 170,538 prompt and 13,349 completion tokens, no fallbacks. The model runs at temperature 0.2, so runs vary: an earlier recording with a draft prompt (which overstated the backtest, see below) gave +0.150, [-0.025, 0.325], 42 lifts, 12 gained and 2 lost.

Split of the lifts proposed when taking every eligible lift: lifts the shipped margin backs gained a hit 16 times and lost one 7 times (40 no change); lifts it declines gained 8 and lost 7 (42 no change). Declined lifts roughly break even rather than lose; the rule gains by spending its two lift slots on backed lifts instead. The prompt states exactly that.

## How the rule was chosen, and what that costs

The margin was chosen after looking at this data, so the in sample +0.200 is optimistic. To bound that:

- Leave one market out selection over the 8 candidate policies in the test (take every lift, decline all, panel share margins of minus 0.10, 0 and plus 0.10, twin count at least and above, adjacent only) picks the shipped margin in all 40 folds, so the nested estimate equals the in sample one (+0.200, [0.025, 0.375]).
- An earlier exploratory set of 10 policies (including two combined twin and panel rules) gave a nested estimate of +0.150, [0, 0.325]. The honest reading is a gain of about 0.15 to 0.2 top 5 hits per market, with the lower bound at or just above zero.
- A pre registered style rule from a pair level analysis (lift only when the lower brand is at least as strong on both twin count and panel share) gave +0.075, [-0.025, 0.175] in this loop.

## Caveats

- Overlap is simulated; the backtest tests the comparable market judgment, not the overlap signal.
- Twin rank coefficients were fit on the same 40 markets (minor leak in the order only, not in the review).
- Panel share is a store base rate, not a Qloo signal; the Qloo part is the twin count, which explains the call but does not drive it.
- The live reviewer is gpt-4o-mini. Its replayed result is positive in point estimate with an interval whose lower bound is zero; it lifts about 60% as often as the rule with better precision (13 of 14 lifts that changed hits gained one). The rule is the fallback when the model is unavailable. Since October 26 the server also checks every model call against the shipped rule: on live deploy49 runs gpt-4o-mini declined lifts the 10 point margin backs and wrote reasons with wrong arithmetic (for example calling 19% below 24% minus 10 points). A call that breaks the rule is now overruled and logged as such, and the reason shown to the broker quotes the server's numbers. Live lift and decline decisions therefore follow the shipped rule row above; the model still chooses which backed lift goes first. That combined path was not replayed separately.
