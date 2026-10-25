# Taste-twin comparables: backtest (40-address panel)

Question: if we find the panel markets whose Qloo taste is most like a new site, does a brand's presence
in those markets tell us whether it trades at the new site?

Reproduce: `/workspace/venv-eval/bin/python taste_twin_eval.py` (or any Python with numpy, scipy and
scikit-learn) writes `taste_twin_eval.json`. Shared tables: `backtest_common.py` (same construction as
`analyze.py`, adaptive radius).

## Method

- Taste vector per site: z-score of Qloo insights affinity across the brands scored at that site, minus
  each brand's mean z over the panel (what is distinctive here, not what is popular everywhere).
- Leave one address out. Twins are the K panel sites with the highest Pearson correlation of taste
  vectors, excluding the site itself and any panel site within 50 km (no shared stores, no same metro).
- Twin score for a brand: share of the K twins with a store inside that twin's adaptive radius.
- Metrics per address over all scored brands (about 224), then averaged over the 40 addresses:
  precision at 10 (P@10, ties broken randomly, 50 draws) and ROC AUC against presence at the address.
- Controls: K random panel sites (20 draws, same 50 km rule), the K least similar sites, the panel wide
  presence rate (all sites over 50 km away), and chain size alone.
- K and the vector choice were explored after seeing results (K = 3, 5, 8; dev vs raw z). All are
  reported. The app ships K = 5 with dev vectors. Treat it as one point on the curve, not a
  preregistered test.

## Results (mean over 40 addresses)

| Score (K = 5, dev) | P@10 | AUC |
| --- | ---: | ---: |
| Taste twins (most similar 5) | 0.839 | 0.802 |
| Random 5 panel sites | 0.790 | 0.724 |
| Least similar 5 | 0.664 | 0.638 |
| Panel wide presence rate | 0.882 | 0.788 |
| Chain size only | 0.760 | 0.719 |
| Logistic blend (chain size, context, Qloo z, panel rate) | 0.885 | 0.798 |
| Same blend plus twin score | 0.932 | 0.824 |

Bootstrap over addresses (2000 draws), per-address AUC difference:
- twins minus random 5: +0.078, 95% interval [0.060, 0.098]
- twins minus panel wide rate: 95% interval [-0.008, 0.037] (not distinguishable)

Other settings: K = 3 twins 0.765 / 0.772 (random 0.703 / 0.694); K = 8 twins 0.889 / 0.811
(random 0.839 / 0.750). Raw z vectors behave about the same (K = 5: 0.829 / 0.792).

## What this supports, and what it does not

- Supported: Qloo taste similarity picks informative comparables. The most similar markets beat random
  markets on every setting, and the least similar markets are worst, a clean dose response.
- Not supported: twins alone do not beat "how common is this brand across the whole panel" on P@10
  (0.839 vs 0.882), and the AUC gap to it is within noise.
- Adding the twin score to a blend helps (P@10 0.885 to 0.932), but that blend is an offline
  experiment. The shipped ranking is unchanged; the app shows twins as evidence only.
- Small panel: 40 addresses, one recorded Qloo pull per address. Live sites use the radius and
  insights of the current run, so their vectors are close to, not identical to, the panel's.

## How the app uses it

`apps/worker/src/lib/taste-twins.ts` with the static panel `apps/worker/src/lib/taste-twin-panel.json`
(built by `scripts/eval/build-taste-twin-panel.py`). It reuses the insights the run already fetched:
no extra Qloo calls, no KV writes. Each pitch gets `tasteTwins` (present in N of 5, which markets) and,
when N is 3 or more, one reason line such as "Already trades in 4 of the 5 test markets whose Qloo taste
is closest to this site (...)". The report's Why card shows the count for every pitch, including zero.
