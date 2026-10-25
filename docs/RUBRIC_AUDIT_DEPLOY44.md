# Qloo Agentic Hackathon: judge rubric audit (LeaseUp), deploy44

**Locked rubric:** this audit reuses [`RUBRIC_AUDIT_OCT24.md`](RUBRIC_AUDIT_OCT24.md) without changes: the same six criteria, the same unweighted mean, the same anchors, the same Devpost bucket mapping and the same method (production first, then code, then README). Same rubric as [`RUBRIC_AUDIT_DEPLOY39.md`](RUBRIC_AUDIT_DEPLOY39.md), [`RUBRIC_AUDIT_DEPLOY41.md`](RUBRIC_AUDIT_DEPLOY41.md) and [`RUBRIC_AUDIT_DEPLOY43.md`](RUBRIC_AUDIT_DEPLOY43.md).

**Current audit baseline:** production **deploy44**. Pages https://leaseup-59m.pages.dev (deployment `a2a0e38d`), Worker version `78a2ee89` at 100% (deployed 2026-10-25 15:17 UTC); `GET https://leaseup-worker.issue-atharva.workers.dev/api/health` returned **`gitSha` `72e9481`**, **`mode` `live`**, **`liveOffload` `loopback`**, Qloo + OpenAI **configured**. Integration code head **`72e9481`** (#176).

**Prior baselines:** deploy43 / `ede0644` composite **7.708**; deploy41 / `234364e` **7.625**; deploy39 / `a0d15e4` **7.375**; deploy34 / `84971a5` **7.25**.

> **Scoring rule:** 1 = prototype / missing; 10 = best-in-class for a hackathon field. Scores are **not** rounded up. If production behavior contradicts marketing copy, the score follows **production**.

Composite = **unweighted mean of six**. Walkthrough still the pre-planner recording; not treated as available.

---

## Summary table (deploy44 / `72e9481`)

| Criterion | deploy43 | deploy44 | One-line verdict |
| --- | ---: | ---: | --- |
| Use of Qloo API | 7.5 | **7.5** | Live Qloo usage unchanged; the same calls now run in separate invocations. |
| Agentic behavior | 7.5 | **8.0** | On two live non-demo production runs the full model chain ran: gpt-4o-mini planner (6 tool steps), gpt-4o-mini post-rank review (no fallback) and gpt-4o-mini drafts, each with a persisted receipt. Held back: the model review kept the top 5 on both runs, so production shows no model-driven reorder yet, and the review backtest is neutral. |
| Technical execution | 9.0 | **9.0** | Fan-out through a free `ctx.exports` loopback binding, per-invocation subrequest metering persisted in every job, and a non-demo CI budget test. Not raised further: `/api/analyze` (non-prospecting) is not covered by the offload, and one e2e round failed on the first push (dev wrangler did not know the flag) before the fix. |
| Originality | 7.0 | **7.0** | Unchanged. |
| Real-world usefulness | 7.75 | **8.0** | Live outreach drafts are now AI-written and grounded in the site's facts (taste rank, distance to nearest store, twin markets, store count) instead of "Template, AI unavailable". |
| Presentation | 7.5 | **7.5** | Same design; smoke clean at 1440 and 390. Walkthrough still stale. |

**Composite:** (7.5 + 8.0 + 9.0 + 7.0 + 8.0 + 7.5) / 6 = 47.0 / 6 = **7.833**. Meets the 7.8 target.

---

## Production verification: live non-demo runs (live Qloo quota)

| Field | deploy43 (`ede0644`) | deploy44 run 1 (`72e9481`) | deploy44 run 2 (`72e9481`) |
| --- | --- | --- | --- |
| Address | 240 Bedford Ave, Brooklyn, NY 11249 | same | 1000 Fulton St, Brooklyn, NY 11238 |
| Job id | `3c3b6ebd-78b8-4a4b-9b4a-db8c3332cd42` | `ef293784-aec8-4948-8fa9-21fa1088e459` | `02bac464-45a1-4ed4-a65e-6c5849ef63d2` |
| Created (UTC) | 2026-10-25 14:27 | 2026-10-25 15:18 | 2026-10-25 15:19 |
| Planner | 6 model steps, 1 Qloo call | 6 model steps, 1 Qloo call | 6 model steps |
| Review | `fallbackReason`: Too many subrequests; rule review | `planner: "model"`, no `fallbackReason`; 1 gpt-4o-mini call, 739 tokens | `planner: "model"`, no `fallbackReason`; 1 gpt-4o-mini call, 617 tokens |
| Review outcome | top 5 changed (rule) | "Review kept the ranked top 5." | "Review kept the ranked top 5." |
| Outreach drafts | 3 x "Template, AI unavailable" | 3 x `model: "gpt-4o-mini"` (Ulta, HomeGoods, Victoria's Secret) | 3 x `model: "gpt-4o-mini"` (Ulta, HomeGoods, Vans) |
| Step errors | none besides the fallbacks | none; all 9 steps complete | none; all 9 steps complete |

Evidence: `GET /api/prospecting/<job id>` (`steps[agent_plan].detail.review`, `steps[agent_plan].detail.subrequests`, `outreachDrafts[].model`). UI https://leaseup-59m.pages.dev/prospect/ef293784-aec8-4948-8fa9-21fa1088e459 and https://leaseup-59m.pages.dev/prospect/02bac464-45a1-4ed4-a65e-6c5849ef63d2. Local captures (not gallery): `shots44/bedford1-run-1440.png`, `shots44/bedford1-receipt-1440.png`, `shots44/bedford1-job.json`, `shots44/fulton2-run-1440.png`, `shots44/fulton2-receipt-1440.png`, `shots44/fulton2-job.json`.

**Correction to the #174 claim:** #174 alone did not keep live runs under the cap; its budget test ran on the demo planner path. #176 fixed it: one batched gpt-4o-mini call for the 3 drafts and one for the "Why" summaries, an in-isolate co-tenancy memo, and three free loopback invocations (audience fan-out, co-tenancy, review plus drafts), each with its own 50-subrequest budget.

### Subrequest budget (Workers Free: 50 per invocation, Cache API counts)

Stubbed harness, realistic non-demo Bedford run (`live-prospecting-model-path-budget.test.ts`):

| Invocation | Before #176 | After #176 (CI asserts each at or under 45) |
| --- | ---: | ---: |
| Create (geocode) | 4 | 4 |
| Run | **69** (Qloo 22, cache 25, assets 11, OpenAI 9, Nominatim 2) | **33** |
| Audience fan-out (loopback) | n/a | 25 |
| Co-tenancy (loopback) | n/a | 7 |
| Review and drafts (loopback) | n/a | 3 |

Production, measured by the in-Worker meter and stored per job:

| Run | Run invocation | Audience fan-out | Co-tenancy | Review and drafts | Highest |
| --- | ---: | ---: | ---: | ---: | ---: |
| deploy43 Bedford | over 50 ("Too many subrequests"; not metered then) | n/a | n/a | n/a | over 50 |
| deploy44 Bedford | 20 | 12 | 8 | 2 | **20** |
| deploy44 Fulton (cold address) | 31 | 12 | 6 | 2 | **31** |

The loopback binding is `ctx.exports.LiveOffload` (compat flag `enable_ctx_exports`), a service binding to the same Worker: no extra cost on Workers Free, each call counts 1 toward the caller. No Queues, Durable Objects or paid features.

## Backtests (offline, unchanged)

Taste twins K=5: P@10 0.839, AUC 0.802; blend with twin 0.932 / 0.824. AUC twin minus random 95% CI [0.060, 0.098]; twin minus panel rate [-0.008, 0.037] (not significant). Review lift: 0 valid lifts at the 3 demo chips (neutral). Details in [`RUBRIC_AUDIT_DEPLOY43.md`](RUBRIC_AUDIT_DEPLOY43.md).

## Smoke (deploy44, GET only)

`smoke44.mjs` (Playwright, 1440 and 390): 20 of 20 pages clean, `pagesBad: []`; pitch 5/5 (LEASING BRIEF); 0 HTTP 429; 0 CSP; 0 console errors; 0 UI dashes; report pages "Recorded demo"/"Recorded" with 0 POSTs, 0 analyze calls and exactly 1 demo GET each; watchlist saves and persists (1 to 1); live prospecting page shows 6 planner steps and the review section.

Live Qloo quota used in the current window (`live-qloo-judge:2026-10-25`): **6 of 48** (2 for this audit).

---

## 1. Use of Qloo API: **7.5 / 10** (unchanged)

Same live `/v2/insights` usage and judge quota; the per-brand audience lookups now run in a loopback invocation. Not deeper usage, so the anchor does not move.

## 2. Agentic behavior: **8.0 / 10** (deploy43: 7.5)

Up: the deploy43 hold-back was that the gpt-4o-mini reviewer had never run on a production live run. On deploy44 it ran on both live non-demo runs with no fallback, after the model planner's 6 tool steps, and the drafts that follow are model-written. Planner, review and drafts each leave a persisted receipt (`review.modelUsage`, `review.outcome`, `outreachDrafts[].model`) plus per-invocation subrequest counts. Not higher: the model review kept the top 5 both times, so there is no production example yet of the model reviewer reordering, and the review backtest stays neutral.

## 3. Technical execution: **9.0 / 10** (unchanged)

Up-side: the subrequest cap is fixed with a free pattern, metered in production and guarded in CI on a non-demo address (worker 344 tests, CI 17/17 on #176). Not raised: `/api/analyze` is still single-invocation, and the first CI round on #176 failed because the dev wrangler did not know `enable_ctx_exports` (the flag now lives only in the production config).

## 4. Originality: **7.0 / 10** (unchanged)

No new idea this round.

## 5. Real-world usefulness: **8.0 / 10** (deploy43: 7.75)

Up: the deploy43 hold-back was that live outreach drafts were templates. On deploy44 each live run produced 3 gpt-4o-mini drafts using the run's own evidence, for example: "Ulta has a Qloo taste rank of 12 and no store within 3 km, with the nearest location 7.1 km away... Ulta already trades in 3 of the 5 test markets whose Qloo taste is closest to this site." Drafts are never sent.

## 6. Presentation: **7.5 / 10** (unchanged)

Design unchanged, smoke clean. Gallery and README screenshots deliberately not retaken (owner hold). Walkthrough still stale.

---

## What would move it further

Composite 7.833 meets 7.8. Next honest gains: a production run where the model review changes the order for a stated reason, a review backtest with positive lift, and a fresh walkthrough.

## Mapping to official Devpost buckets

| Bucket | deploy43 | deploy44 | Note |
| --- | ---: | ---: | --- |
| Technological Implementation | 8.75 | **9.0** | The cap issue that offset the budget work is resolved in production. |
| Design | 7.5 | **7.5** | Unchanged. |
| Potential Impact | 7.75 | **8.0** | Live drafts are AI-written. |
| Quality of Idea | 7.25 | **7.25** | Unchanged. |

## Quick verification checklist (deploy44 / `72e9481`)

- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/health` shows `gitSha` `72e9481`, `mode` `live`, `liveOffload` `loopback`.
- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/prospecting/02bac464-45a1-4ed4-a65e-6c5849ef63d2` shows `review.planner: "model"` with no `fallbackReason`, `detail.subrequests.total` 31 with three `ok: true` offloads, and `outreachDrafts[].model` `gpt-4o-mini`.
- Rollback: deploy43 Worker `f8cad3c8-0f04-4b91-b946-fa8b00dc3e2e` + Pages `cc94d2f2-094c-47a5-9c8a-2c020f2b0522`.

## Revision history

- deploy44 / `72e9481`: 7.833 (this audit).
- deploy43 / `ede0644`: 7.708.
- deploy41 / `234364e`: 7.625.
- deploy39 / `a0d15e4`: 7.375.
- deploy34 / `84971a5`: 7.25.
