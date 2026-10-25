# Qloo Agentic Hackathon: judge rubric audit (LeaseUp), deploy46

**Locked rubric:** this audit reuses [`RUBRIC_AUDIT_OCT24.md`](RUBRIC_AUDIT_OCT24.md) without changes: the same six criteria, the same unweighted mean, the same anchors, the same Devpost bucket mapping and the same method (production first, then code, then README). Same rubric as [`RUBRIC_AUDIT_DEPLOY45.md`](RUBRIC_AUDIT_DEPLOY45.md). No category was added.

**Current audit baseline:** production **deploy46**. Pages https://leaseup-59m.pages.dev (deployment `b87fc3f3`), Worker version `b4690930` at 100% (deployed 2026-10-25 22:54 UTC); `GET https://leaseup-worker.issue-atharva.workers.dev/api/health` returned **`gitSha` `4dd8bcb`**, **`mode` `live`**, **`liveOffload` `loopback`**, Qloo + OpenAI **configured**. Integration code head **`4dd8bcb`** (#180, #181).

**Prior baselines:** deploy45 / `2c4db0a` composite **7.875**; deploy44 / `72e9481` **7.833**; deploy43 / `ede0644` **7.708**; deploy41 / `234364e` **7.625**; deploy39 / `a0d15e4` **7.375**; deploy34 / `84971a5` **7.25**.

> **Scoring rule:** 1 = prototype / missing; 10 = best-in-class for a hackathon field. Scores are **not** rounded up. If production behavior contradicts marketing copy, the score follows **production**.

Composite = **unweighted mean of six**. Walkthrough still the pre-planner recording; not treated as available. Gallery and README screenshots are on owner hold and were not touched.

---

## Summary table (deploy46 / `4dd8bcb`)

| Criterion | deploy45 | deploy46 | One-line verdict |
| --- | ---: | ---: | --- |
| Use of Qloo API | 7.5 | **7.75** | Qloo taste vectors now pick comparable markets that feed the live pitch order, and that order beats the shipped blend on the 40 site backtest. |
| Agentic behavior | 8.25 | **8.25** | Unchanged. The review still takes every eligible lift; no new reviewer backtest. |
| Technical execution | 9.0 | **9.0** | Unchanged. The twin fix adds a Python to TypeScript parity test, but this is in line with the existing bar. |
| Originality | 7.0 | **7.25** | Ranking by "where do this site's taste twins already trade" is a new idea for this product and it is measured, not only displayed. |
| Real-world usefulness | 8.0 | **8.25** | The live pitch order now has leave one out evidence of better hits (22 sites better, 4 worse in the prospecting pool). |
| Presentation | 7.5 | **7.5** | Unchanged and capped by the owner hold on gallery, README screenshots and walkthrough. |

**Composite:** (7.75 + 8.25 + 9.0 + 7.25 + 8.25 + 7.5) / 6 = 48.0 / 6 = **8.0**.

---

## What changed

**#180 Fix taste twin matching and rank live addresses with a taste twin blend** (`9d625b8`)

- Bug: twin matching compared a site vector z-scored over the run's brands with panel vectors z-scored over all panel brands. On a live run that only returns about 50 brands the scales did not match, so Bedford Ave (Brooklyn) matched Elko, Laramie and Ottumwa. Fix: `siteTasteVector` and `findTasteTwins` (`apps/worker/src/lib/taste-twins.ts`) z-score panel sites over the same brand subset as the run. A regression test pins that Bedford gets no rural twins, and a parity test checks the TypeScript twins and order against the Python eval on three sites (`fixtures/twin-rank-parity.json`).
- New ranking: `orderInsightsByTwinBlend` (`apps/worker/src/lib/twin-rank.ts`) scores each brand on chain size, Qloo affinity z and the share of the 5 taste twins where the brand trades, with coefficients fit by `scripts/eval/build-twin-rank-coefficients.py`. It is the order for live addresses that are not one of the three demo chips and have at least 30 panel brands; demo chips keep the standard blend so their recorded numbers do not move.
- Visible in production: `rankingModel` on the analyze response (`kind: "taste_twins"` plus the twin markets), the backtest step summary ("blend uses 5 taste twins") and a line in the report proof banner.

**#181 Say when taste twins feed the pitch order** (`4dd8bcb`)

- The Why card said twin markets were "evidence only". On twin ranked runs it now says the share is one input to the pitch order. `SUBMISSION.md` describes the twin blend and its result.

## Backtest (offline, `data/qloo-eval-40/TWIN_RANK_EVAL.md`, `twin_rank_eval.json`)

Leave one site out on the 40 site panel; the held out site is removed from the panel before its twins are found. Shipped specification (m1 plus twin share, fit on both pools of the 39 training sites):

| Pool | Arm | P@5 | P@10 | AUC |
| --- | --- | ---: | ---: | ---: |
| top 50 (live prospecting) | standard blend | 0.730 | 0.640 | 0.712 |
| top 50 (live prospecting) | twin blend | 0.800 | 0.728 | 0.778 |
| all brands (analyze) | standard blend | 0.885 | 0.818 | 0.754 |
| all brands (analyze) | twin blend | 0.935 | 0.898 | 0.821 |

P@10 gain 95% CI over sites: top 50 [+0.047, +0.133], all [+0.042, +0.117]. AUC gain: top 50 [+0.039, +0.092], all [+0.041, +0.091]. Top 10 hits improve at 22 sites and get worse at 4 (top 50).

How much of this is Qloo taste and not just "brands common on the panel":

- With the old inconsistent twins the top 50 gain disappears (P@10 0.628 to 0.638, AUC CI [-0.006, -0.001]). Matching on Qloo taste correctly is what makes the signal work in the prospecting pool.
- A taste free arm (standard blend plus each brand's presence rate across the whole panel) also helps: top 50 P@10 0.693, all 0.885. Adding twin share on top of that rate still raises AUC (top 50 CI [+0.013, +0.049]) and all pool P@10 (CI [+0.015, +0.055]), but the top 50 P@10 gain over the rate arm is not significant (CI [-0.010, +0.065]). So part of the lift is a panel base rate and part is taste specific. The shipped model uses twin share only.
- Post hoc: K=5, 50 km and the 30 brand minimum were fixed in the earlier taste twin eval; one specification was shipped. Store presence is a proxy for fit, not leasing interest.

## Production verification (live Qloo quota)

| Field | deploy46 Bedford |
| --- | --- |
| Address | 240 Bedford Ave, Brooklyn, NY 11249 |
| Prospecting job | `ffb37ffa-3c99-426f-a799-b994a19ff206` (created 2026-10-25 22:43 UTC) |
| Analyze run | `bfa03ccb-32c0-4c69-9c4d-60c276854f76` |
| `rankingModel` | `taste_twins`: Las Vegas Strip; Lakeview, Chicago; Wicker Park, Chicago; Fillmore St, San Francisco; Mission St, San Francisco (deploy45 run of the same address matched rural sites before the fix) |
| Backtest step | "Adaptive 1.5 km · raw 4/10 · blend 7/10 · random ~0.0/10 · blend uses 5 taste twins" |
| Review | model, 2 calls, 2,965 tokens, 2 lifts (H&M, Vans), same as deploy45 |
| Report (all brands) | twins Wellesley, MA; Fillmore St and Mission St, San Francisco; Rittenhouse, Philadelphia; Bethesda, MD. Proof banner line shown at 1440 and 390; Why TJ Maxx card: "trades in 3 of the 5 test markets ... This share is one input to the pitch order on this run." |

The prospecting top 5 at Bedford is the same as deploy45 (Ulta, HomeGoods, Victoria's Secret, H&M, Vans before review), so on this address the visible change is the twin set and the labels, not the top 5. Prospecting (about 50 brands) and the report (224 brands) find different twins because twins are matched on the brands each run returned; both sets are dense urban markets.

Local captures (not gallery): `shots46/bedford46-run-1440.png`, `shots46/bedford46-receipt-1440.png`, `shots46/bedford46-twinline-1440.png`, `shots46/bedford46-twinline-390.png`, `shots46/bedford46-job.json`, `shots46/bedford46-analyze.json`.

Live Qloo quota (`live-qloo-judge:2026-10-25`): **13 of 48** after this audit (5 used here). The counter was only read.

## Smoke (deploy46, GET only)

`smoke46.mjs` (Playwright, 1440 and 390): 22 of 22 pages clean, `pagesBad: []`; pitch 5/5 (LEASING BRIEF); 0 HTTP 429; 0 CSP; 0 console errors; 0 UI dashes; 0 buttons inside links; report pages "Recorded demo"/"Recorded" with 0 POSTs and 0 analyze calls; pipeline and watchlist persist; both prospecting pages show the planner steps and review section. Report load at 390 px: Wicker 1.49 s, Boulder 1.12 s, Sevierville 0.88 s.

---

## 1. Use of Qloo API: **7.75 / 10** (deploy45: 7.5)

Up: deploy45 named "a new Qloo signal that improves the panel backtest" as the honest path. Qloo brand insights now build a site taste vector that picks 5 comparable markets, and where brands trade in those markets changes the live pitch order, with a confidence interval that excludes zero on both pools. It is visible on the run (`rankingModel`, backtest step, report line). Not higher: no new Qloo endpoint or call; part of the lift is a panel base rate rather than taste (see above); demo chips, which most judges open first, still use the standard blend; raw Qloo affinity alone still loses to chain size.

## 2. Agentic behavior: **8.25 / 10** (unchanged)

The reviewer still takes every lift it is allowed, and the review backtest is still neutral. No change shipped.

## 3. Technical execution: **9.0 / 10** (unchanged)

The fix ships with parity and regression tests and a reproducible eval script; 17 of 17 CI on both PRs. This matches the existing standard rather than raising it.

## 4. Originality: **7.25 / 10** (deploy45: 7.0)

Up: using Qloo taste to find comparable markets and ranking tenants by where they already trade in those markets is a broker style comp analysis built on taste data, and it is tested rather than decorative. Not higher: comparable market analysis itself is standard in retail real estate.

## 5. Real-world usefulness: **8.25 / 10** (deploy45: 8.0)

Up: deploy45 held because there was no evidence that a changed order leads to better pitches. The order a broker now sees on a live address puts more brands that fit similar markets in the top 10 (top 50 pool P@10 0.640 to 0.728, 22 sites better, 4 worse), and the Why card names the twin markets where the brand trades, which a broker can use in the pitch. Not higher: the metric is store presence, not deals; the Bedford top 5 did not change.

## 6. Presentation: **7.5 / 10** (unchanged)

The new line and note are small UI copy. Gallery, README screenshots and walkthrough are on owner hold and still show older builds.

---

## What would move it further

Presentation is the largest gap: a fresh gallery and README stills of the live twin ranking, review callout and receipt, plus a re-recorded walkthrough, would justify 7.75 to 8.0 (composite 8.042 to 8.083) once the owner lifts the hold. Agentic: a reviewer that declines lifts on evidence, with a positive panel backtest. Qloo: twin ranking on the demo chips (would change recorded numbers, so it needs a re-record).

## Mapping to official Devpost buckets

| Bucket | deploy45 | deploy46 | Note |
| --- | ---: | ---: | --- |
| Technological Implementation | 9.0 | **9.0** | Unchanged. |
| Design | 7.5 | **7.5** | Unchanged (media hold). |
| Potential Impact | 8.0 | **8.25** | Better tested live pitch order. |
| Quality of Idea | 7.25 | **7.5** | Taste twin comparables feed ranking. |

## Quick verification checklist (deploy46 / `4dd8bcb`)

- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/health` shows `gitSha` `4dd8bcb`, `mode` `live`.
- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/analyze/bfa03ccb-32c0-4c69-9c4d-60c276854f76` shows `result.rankingModel.kind` `taste_twins` with 5 urban twins.
- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/prospecting/ffb37ffa-3c99-426f-a799-b994a19ff206` shows the backtest step summary ending "blend uses 5 taste twins".
- Rollback: deploy45 Worker `3cb9c22e-e31f-4dd4-9984-c0b2ce5cef32` + Pages `96767763-4b85-4ccf-84ad-b31cf1c8ee13`.

## Revision history

- deploy46 / `4dd8bcb`: 8.0 (this audit).
- deploy45 / `2c4db0a`: 7.875.
- deploy44 / `72e9481`: 7.833.
- deploy43 / `ede0644`: 7.708.
- deploy41 / `234364e`: 7.625.
- deploy39 / `a0d15e4`: 7.375.
- deploy34 / `84971a5`: 7.25.
