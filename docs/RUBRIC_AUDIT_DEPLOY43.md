# Qloo Agentic Hackathon: judge rubric audit (LeaseUp), deploy43

**Locked rubric:** this audit reuses [`RUBRIC_AUDIT_OCT24.md`](RUBRIC_AUDIT_OCT24.md) without changes: the same six criteria, the same unweighted mean, the same anchors, the same Devpost bucket mapping and the same method (production first, then code, then README). Same rubric as [`RUBRIC_AUDIT_DEPLOY39.md`](RUBRIC_AUDIT_DEPLOY39.md) and [`RUBRIC_AUDIT_DEPLOY41.md`](RUBRIC_AUDIT_DEPLOY41.md).

**Current audit baseline:** production **deploy43**. Pages https://leaseup-59m.pages.dev (deployment `cc94d2f2`), Worker version `f8cad3c8` at 100% (deployed 2026-10-25 14:27 UTC); `GET https://leaseup-worker.issue-atharva.workers.dev/api/health` returned **`gitSha` `ede0644`**, **`mode` `live`**, Qloo + OpenAI **configured**. Integration code head **`ede0644`** (#174).

**Prior baselines:** deploy41 / `234364e` composite **7.625**; deploy39 / `a0d15e4` **7.375**; deploy34 / `84971a5` **7.25**.

> **Scoring rule:** 1 = prototype / missing; 10 = best-in-class for a hackathon field. Scores are **not** rounded up. If production behavior contradicts marketing copy, the score follows **production**.

Composite = **unweighted mean of six**. Walkthrough still the pre-planner recording; not treated as available.

---

## Summary table (deploy43 / `ede0644`)

| Criterion | deploy41 | deploy43 | One-line verdict |
| --- | ---: | ---: | --- |
| Use of Qloo API | 7.5 | **7.5** | Live Qloo usage unchanged. Taste twins reuse stored Qloo affinity vectors from the 40-address panel; no new live calls. |
| Agentic behavior | 7.25 | **7.5** | On a live non-demo run the model planner now completes all its store checks (deploy42: 5 of 6 steps wasted on a missing brand id), and the review changes the production top 5 against the standard ranking, persisted in JSON and UI. Held back: the gpt-4o-mini reviewer still falls back on live runs (subrequest cap), and the review backtest is neutral. |
| Technical execution | 9.0 | **9.0** | Subrequest work cut a live run from 74 to 37 non-model subrequests with regression tests, CI 17/17 on #172, #173, #174. Not raised: production still exceeds the Workers Free cap on a model-planner run, which the budget test missed (its address matched a demo fixture). |
| Originality | 6.75 | **7.0** | Taste-twin markets: for each pitched brand, whether it is present in the 5 most taste-similar markets, with a leave-one-address-out backtest. Broker-fit and not a gimmick. |
| Real-world usefulness | 7.75 | **7.75** | Twins give a broker a concrete analog argument ("present in 4 of 5 similar markets"), but live outreach drafts are still templates (AI unavailable) because of the same subrequest cap. |
| Presentation | 7.5 | **7.5** | Same design; one twin block on the pitch card; smoke clean at 1440 and 390. Walkthrough still stale. |

**Composite:** (7.5 + 7.5 + 9.0 + 7.0 + 7.75 + 7.5) / 6 = 46.25 / 6 = **7.708**. Below the 7.8 target; see [What is missing for 7.8](#what-is-missing-for-78).

---

## Production verification: live Bedford runs (non-demo, live Qloo quota)

| Field | deploy42 (`c804036`) | deploy43 (`ede0644`) |
| --- | --- | --- |
| Address | 240 Bedford Ave, Brooklyn, NY 11249 | same |
| Job id | `24a8f197-fbd2-496d-bfc4-fb1f9ed14db1` | `3c3b6ebd-78b8-4a4b-9b4a-db8c3332cd42` |
| Created (UTC) | 2026-10-25 14:09 | 2026-10-25 14:27 |
| Planner | 6 model steps, 1 Qloo call; 5 rows "Nearest store not checked (missing brand id)" | 6 model steps (`planner: "model"`), 1 Qloo call; Sephora 0.02 km, Victoria's Secret 3.37 km, Starbucks 0.74 km, Whole Foods 0.02 km all checked |
| Review | `fallbackReason`: Too many subrequests; rule review kept the top 5 | `fallbackReason`: Too many subrequests; rule review lifted H&M (1 verified local audience overlap) above Victoria's Secret (checked, none) |
| Standard top 5 | Ulta, HomeGoods, Victoria's Secret, H&M, Vans | Ulta, HomeGoods, Victoria's Secret, H&M, Vans |
| Final top 5 | same as standard | Ulta, HomeGoods, **H&M, Victoria's Secret**, Vans (`top3Changed: true`, `top5Changed: true`) |
| Outcome line (UI) | "Same top 5 as the standard ranking." | "Changed vs the standard ranking: H&M #4 to #3; Victoria's Secret #3 to #4." |
| Outreach drafts | 3 x "Template, AI unavailable" | 3 x "Template, AI unavailable" |
| Taste twins | n/a | present in JSON (first prospect in the payload: `tasteTwins.presentIn` 4 of 5) |

Evidence: `GET /api/prospecting/3c3b6ebd-78b8-4a4b-9b4a-db8c3332cd42` (`steps[1].detail.review`), UI https://leaseup-59m.pages.dev/prospect/3c3b6ebd-78b8-4a4b-9b4a-db8c3332cd42. Local captures (not gallery): `shots42/bedford-run-1440.png`, `shots42/bedford-receipt-1440.png`, `shots42/bedford43-run-1440.png`, `shots42/bedford43-receipt-1440.png`, `shots42/bedford43-job.json`.

**Correction to the #174 commit message:** it says the gpt-4o-mini review and drafts "no longer hit Too many subrequests". The deploy43 production run shows they still do. The measured cut is real, but not enough on the model-planner path.

### Subrequest budget (Workers Free: 50 per invocation, Cache API counts)

Measured with the stubbed harness of `apps/worker/src/__tests__/live-prospecting-subrequest-budget.test.ts`:

| Path | Non-model subrequests | gpt-4o-mini calls | Total |
| --- | ---: | ---: | ---: |
| Before #174 (demo planner path) | 74 | 4 | 78 |
| After #174 (demo planner path, the CI test) | 37 | 4 | 41 |
| After #174 (model planner path, Bedford-like, measured for this audit) | 43 | 14 | **57** |

Model-path breakdown: Nominatim 2 fetch + 2 cache ops; Qloo panel 6 fetch + 2 cache ops; 10 static tile assets; tags and audiences 3 fetch + 6 cache ops + 1 asset; co-tenancy 4 identical match+fetch retries (8); verify 2 cache ops; planner 6 + review + drafts model calls.

## Backtests (offline, honest)

**Taste twins** (`data/qloo-eval-40/TASTE_TWIN_EVAL.md`; 40 addresses, leave-one-address-out, 50 km exclusion):

| Score | P@10 | AUC |
| --- | ---: | ---: |
| Twins K=5 | 0.839 | 0.802 |
| Random 5 markets | 0.790 | 0.724 |
| Least similar 5 | 0.664 | 0.638 |
| Panel-wide presence rate | 0.882 | 0.788 |
| Chain size | 0.760 | 0.719 |
| Blend without twin | 0.885 | 0.798 |
| Blend with twin | 0.932 | 0.824 |

AUC twin minus random: 95% CI [0.060, 0.098]. AUC twin minus panel rate: CI [-0.008, 0.037] (not significant). K=5 was chosen after looking at results (disclosed). The blend-with-twin row is an offline result; production shows twins as evidence and does not re-rank with them.

**Review lift** (`data/qloo-eval-40/REVIEW_LIFT_BACKTEST.md`): 0 valid lifts at all 3 demo chips, so the rule policy is neutral on the panel; P@3 0.444, P@5 0.40, P@10 0.40. Presence rate 0.341 with verified audience overlap vs 0.231 without (directional support for the rule, small n).

## Smoke (deploy43, GET only)

`smoke42.mjs` (Playwright, 1440 and 390): 20 of 20 pages clean, `pagesBad: []`; pitch 5/5 (LEASING BRIEF); 0 HTTP 429; 0 CSP; 0 console errors; 0 UI dashes; report pages "Recorded demo"/"Recorded" with 0 POSTs, 0 analyze calls and exactly 1 demo GET each; watchlist saves and persists (1 to 1); live prospecting page shows 6 planner steps, the review section and "Top 5 after review: Ulta, HomeGoods, H&M, Victoria's Secret, Vans".

Live Qloo quota used in the current window (`live-qloo-judge:2026-10-25`): **4 of 48** (2 for this audit, 2 from deploy41 the evening before).

---

## 1. Use of Qloo API: **7.5 / 10** (unchanged)

Batched live `/v2/insights` and the judge quota are unchanged. Taste twins compute market similarity from Qloo brand-affinity vectors stored from the 40-address panel (`apps/worker/src/lib/taste-twins.ts`, `taste-twin-panel.json`). That is a new, justified use of Qloo data, but it is static, not deeper live usage, so the anchor does not move.

## 2. Agentic behavior: **7.5 / 10** (deploy41: 7.25)

Up: on a live non-demo run the model planner's tool calls now resolve brand names to panel ids (`resolveAgentEntityId`) and every store check runs; brands outside the fetched panel are reported as not checked, never guessed. The post-rank review changed the production top 5 versus the standard ranking with a stated evidence-backed reason, and the before/after diff is in the receipt JSON (`review.outcome`) and the UI. Held back: the model reviewer (gpt-4o-mini) has still not run successfully on a production live run (honestly labelled fallback both times), and the review policy backtest is neutral.

## 3. Technical execution: **9.0 / 10** (unchanged)

Static tile memo scoped per ASSETS binding, recent-miss cache skip, planner name resolution, 343 worker tests, CI 17/17. Not raised because the shipped budget test covered only the demo planner path and production still hits the cap.

## 4. Originality: **7.0 / 10** (deploy41: 6.75)

Taste-twin markets are a broker-native idea ("this brand already wins in 4 of the 5 markets most like yours") backed by a disclosed backtest that beats random analogs.

## 5. Real-world usefulness: **7.75 / 10** (unchanged)

Twins strengthen the pitch argument, and the Bedford review moved a brand with local audience evidence up. Not raised: live outreach drafts are still templates.

## 6. Presentation: **7.5 / 10** (unchanged)

Design unchanged, smoke clean. Gallery and README screenshots deliberately not retaken (owner hold). Walkthrough still stale.

---

## What is missing for 7.8

Needed: sum 46.8; current 46.25 (short 0.55).

1. **gpt-4o-mini review and AI drafts running on a production live run** (Agentic to 8.0, Usefulness to 8.0): +0.75, sum 47.0 = **7.83**. Blocker: 57 subrequests on the model path vs the Free cap of 50. Free fixes, not yet built: run the review and drafts in a second invocation (self service binding, its own 50 budget), or cut at least 8 to 10 more (dedupe the 4 identical co-tenancy retries, one batched gpt-4o-mini call for 3 drafts instead of 3), plus a CI budget test on the model-planner path with a non-fixture address.
2. Without item 1 nothing else in reach adds 0.55 honestly.

## Mapping to official Devpost buckets

| Bucket | deploy41 | deploy43 | Note |
| --- | ---: | ---: | --- |
| Technological Implementation | 8.75 | **8.75** | Budget work offset by the remaining cap issue. |
| Design | 7.5 | **7.5** | Unchanged. |
| Potential Impact | 7.75 | **7.75** | Twins help; drafts still templates. |
| Quality of Idea | 7 | **7.25** | Taste-twin markets. |

## Quick verification checklist (deploy43 / `ede0644`)

- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/health` shows `gitSha` `ede0644`, `mode` `live`.
- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/prospecting/3c3b6ebd-78b8-4a4b-9b4a-db8c3332cd42` shows `steps[1].detail.review.outcome.top5Changed: true` and `fallbackReason`.
- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/demo-report/wicker` contains `tasteTwins`.
- Rollback: Worker `7543bbe4-c941-40df-987d-e351763d9daa` (deploy42, `c804036`) + Pages `bf81724b-f7fb-44c8-818b-564c8f576cb2`; or deploy41 Worker `3eaa47c7` + Pages `801b6a9e`.

## Revision history

- deploy43 / `ede0644`: 7.708 (this audit).
- deploy41 / `234364e`: 7.625.
- deploy39 / `a0d15e4`: 7.375.
- deploy34 / `84971a5`: 7.25.
