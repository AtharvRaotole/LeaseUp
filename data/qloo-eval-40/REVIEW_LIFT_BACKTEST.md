# Review after ranking: backtest of the lift policy

Reproduce: `node scripts/eval/dump-review-overlaps.mjs` (after building `@leaseup/fixtures`) writes
`review_lift_overlaps.json`; then `/workspace/venv-eval/bin/python review_lift_backtest.py` writes
`review_lift_backtest.json`.

## Data and method

- Only the three demo chips (chi_wicker, boulder_co, sevierville_tn) have recorded live Qloo local
  audience overlap, for 19 recorded brands each (57 brand-site pairs). Overlap counts come from the
  shipped overlap code.
- Ranking: the leave-one-address-out logistic blend from `analyze.py` (M1), restricted to those brands.
- Ground truth: a store inside the adaptive radius (`ground_truth.json`). Presence stands in for fit.
- Policy: the shipped guardrail. Lift a pitch from the top 8 into the top 5, ahead of a pitch whose overlap
  was checked and is zero, at most 2 moves. The script also enumerates every guardrail valid lift, not
  only the rule's pick.

## Results

| Chip | Present of 19 | P@5 before | P@5 after | P@10 before | P@10 after |
| --- | ---: | ---: | ---: | ---: | ---: |
| chi_wicker | 2 | 0.20 | 0.20 | 0.20 | 0.20 |
| boulder_co | 7 | 0.20 | 0.20 | 0.40 | 0.40 |
| sevierville_tn | 9 | 0.80 | 0.80 | 0.60 | 0.60 |
| Mean | | 0.40 | 0.40 | 0.40 | 0.40 |

- Guardrail valid lifts on this data: **0** at every chip, because each chip's top 5 under this ranking
  already has overlap for every brand. The policy never fires, so P@3, P@5, P@10 and AUC are unchanged.
  The backtest is neutral. It does not show the review improves outcomes.
- P@8 and P@10 cannot change by construction (moves stay inside the top 8).
- Presence rate by overlap: 0.341 with overlap (n = 44) vs 0.231 without (n = 13). Weak and tiny.
  Overlap counts are nearly the same for a brand across sites, so they mostly reflect the brand.

## What changed because of this backtest

The dump showed that "no overlap" for a chip brand often meant "not recorded", not "checked and none".
The review now requires `tradeAreaTasteChecked` before it may displace a pitch (#172); unknown overlap is
never treated as evidence. Production runs record the model's moves and the final top 5 against the
standard ranking in the receipt, so real effects can be measured run by run.
