# Strict Qloo evaluation protocol

This document fixes the scoring rules **before** reading metro results. LeaseUp adopted it on 2026-10-23 because present-in-top-10 (P@10) saturates in dense trade areas (for example Chicago Wicker Park and Manhattan-style corridors).

## Ground truth

- **Presence**: All The Places lists at least one store for the brand inside the evaluation radius from the site pin.
- **Candidate pool**: Qloo brand insights intersected with the 227-chain ATP panel (same pool as the legacy backtest).

## Metrics (all computed; none dropped after the fact)

| ID | Name | Definition |
| --- | --- | --- |
| `spearman_presence` | Spearman rank correlation | Correlation between Qloo rank (1 = best) and binary presence (1 = store in radius) across the full pool. Higher is better ordering. |
| `surprise_present_at10` | Chain-residual hits | Among the top 10 by rank, count brands that are present in the **adaptive** radius and **not** in the chain-size top 10 (baseline rank worse than 10). Rewards taste-led hits that chain size alone would miss. |
| `adaptive_present_at10` | Adaptive-radius P@10 | Present-in-top-10 using a **tighter** radius by site density (urban 3 km, suburban 5 km, tourist 4 km, exurban 7 km), capped by the user search radius. |
| `random_expected` | Random baseline | Hypergeometric mean present count when drawing 10 brands uniformly from the pool (no taste). |
| `random_monte_carlo` | Seeded random ranking | Mean present@10 over 400 permutations (seed 42) of the pool order. |

## Primary metric (pre-selected)

**`spearman_presence`** is the primary headline metric in the product and on `/methodology`.

Reason: it uses the full ranked list, stays informative when P@10 is already 10 of 10, and does not depend on picking a secondary metric after seeing which model wins.

## Winner rules (applied mechanically)

For each site:

1. **Primary**: Qloo wins if `spearman_qloo > spearman_chain + 0.01`. Tied if within 0.01. Otherwise chain size wins.
2. **Surprise hits**: Report both counts; no winner flag (diagnostic).
3. **Adaptive P@10**: Report Qloo vs chain counts; call out when Qloo is below chain.
4. **Random**: Qloo should exceed `random_expected` and `random_monte_carlo`; if not, state that plainly.

## Recording

```bash
node scripts/strict-eval.mjs
# optional live metros:
QLOO_API_KEY=... node scripts/strict-eval.mjs
```

Writes `packages/fixtures/src/eval/strict-results.json`.
