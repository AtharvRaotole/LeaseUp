# Taste twins as a live ranking feature (Oct 25, 2026)

Script: `twin_rank_eval.py` (results in `twin_rank_eval.json`). Shipped coefficients:
`scripts/eval/build-twin-rank-coefficients.py` writes `apps/worker/src/lib/twin-rank-coefficients.json`.

## Bug found: Bedford got rural twins

A live run at 1000 Bedford Ave, Brooklyn (deploy45) returned twins Laramie WY, Park City UT, Elko NV, Ottumwa IA and
Fillmore UT. Cause: live prospecting scores only the top 50 brands by Qloo affinity (planner `take=50`). The worker
z scored that truncated list and compared it to panel vectors z scored over all ~224 brands, so a dense urban site's
top 50 looked like a rural site's full profile. Reproduced offline with Williamsburg's own top 50: the old method
picks Elko, Laramie, Sedalia, Ottumwa and Bemidji.

Fix ("consistent" twins): every panel site is z scored over the same brand subset the run scored, the brand means are
taken over that subset, and the Pearson match uses those vectors. Williamsburg's top 50 now matches Las Vegas Strip,
DC 14th St, Bethesda, Chicago Lakeview and Chicago Wicker Park. A worker parity test checks the TypeScript twins equal
the Python twins for Williamsburg, Boulder and Sevierville.

## Ranking eval

Leave one address out on the 40 site panel. For each held out site t, t is removed from the panel first (the earlier
TASTE_TWIN_EVAL.md blend let training rows use t as a twin; this version does not). twinShare is the share of the 5
twins (over 50 km away) with a store inside their adaptive radius. m1 is the production logistic (chain size, site
context, Qloo affinity z). Metrics are inside each site's pool: top 50 by affinity (live prospecting) or all scored
brands (analyze).

Shipped model (m1 plus twinShare fit on both pools of the 39 training sites):

| Pool | Arm | P@5 | P@10 | AUC |
| --- | --- | ---: | ---: | ---: |
| top 50 | m1 | 0.730 | 0.640 | 0.712 |
| top 50 | m1 + twins | 0.800 | 0.728 | 0.778 |
| all | m1 | 0.885 | 0.818 | 0.754 |
| all | m1 + twins | 0.935 | 0.898 | 0.821 |

P@10 gain, bootstrap 95% CI over sites: top 50 [+0.047, +0.133], all [+0.042, +0.117]. AUC gain: top 50
[+0.039, +0.092], all [+0.041, +0.091]. Top 10 hits improve at 22 of 40 sites and get worse at 4 (top 50 pool).

Per pool fits (same folds) agree: top 50 P@10 0.628 to 0.730, all 0.825 to 0.895. With the old inconsistent twins the
top 50 gain disappears (P@10 0.628 to 0.638, AUC CI [-0.006, -0.001]), which is why Bedford's twins looked wrong.

## Caveats

- Post hoc: K=5, 50 km and the 30 brand minimum were fixed in TASTE_TWIN_EVAL.md; the consistent method came from
  the bug, not from tuning. One specification was shipped; m1 plus a national presence rate arm also helped and was
  not shipped.
- Same snapshot and panel as the rest of the 40 site eval; twin presence is store presence, not sales.
- Recorded demo chips keep the standard blend so their recorded numbers do not move. Live addresses with at least 30
  panel brands use the twin blend; others fall back to the standard blend.
