# Strict evaluation protocol (draft)

LeaseUp legacy present-in-top-10 saturates on dense trade areas. This document lists **candidate** metrics and how to record them. The **headline metric is not chosen yet**; it will be set in `packages/fixtures/src/eval/manifest.json` after the live API evaluation completes.

## Ground truth

- **Presence**: All The Places lists at least one store for the brand inside the evaluation radius from the pin.
- **Candidate pool**: Qloo brand insights intersected with the 227-chain ATP panel.

## Candidate metrics (catalog)

Defined in `packages/fixtures/src/eval/metrics-catalog.ts`:

| ID | Summary |
| --- | --- |
| `legacy_present_at10` | Present in top 10 at the user search radius |
| `adaptive_present_at10` | Present in top 10 at a density-tightened radius |
| `spearman_presence` | Spearman correlation between rank and presence |
| `surprise_present_at10` | Adaptive-radius hits not in chain-size top 10 |
| `random_monte_carlo` | Legacy Qloo P@10 vs seeded random order mean |

## Data plumbing

1. Record metrics: `node scripts/strict-eval.mjs` (fixtures) or import an external bundle.
2. Point `eval/manifest.json` at the bundle file (`resultsBundle`).
3. Set `headlineMetricId` to a catalog id when ready.
4. Register new bundle filenames in `packages/fixtures/src/eval/load-bundle.ts` (one line per file).

## Winner rules (per metric)

Each catalog entry defines `tieBand` and whether higher Qloo values win. UI uses these mechanically; no metric is promoted to headline until manifest says so.
