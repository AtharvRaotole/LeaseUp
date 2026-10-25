# Qloo Agentic Hackathon: judge rubric audit (LeaseUp), deploy45

**Locked rubric:** this audit reuses [`RUBRIC_AUDIT_OCT24.md`](RUBRIC_AUDIT_OCT24.md) without changes: the same six criteria, the same unweighted mean, the same anchors, the same Devpost bucket mapping and the same method (production first, then code, then README). Same rubric as [`RUBRIC_AUDIT_DEPLOY44.md`](RUBRIC_AUDIT_DEPLOY44.md).

**Current audit baseline:** production **deploy45**. Pages https://leaseup-59m.pages.dev (deployment `96767763`), Worker version `3cb9c22e` at 100% (deployed 2026-10-25 21:49 UTC); `GET https://leaseup-worker.issue-atharva.workers.dev/api/health` returned **`gitSha` `2c4db0a`**, **`mode` `live`**, **`liveOffload` `loopback`**, Qloo + OpenAI **configured**. Integration code head **`2c4db0a`** (#178).

**Prior baselines:** deploy44 / `72e9481` composite **7.833**; deploy43 / `ede0644` **7.708**; deploy41 / `234364e` **7.625**; deploy39 / `a0d15e4` **7.375**; deploy34 / `84971a5` **7.25**.

> **Scoring rule:** 1 = prototype / missing; 10 = best-in-class for a hackathon field. Scores are **not** rounded up. If production behavior contradicts marketing copy, the score follows **production**.

Composite = **unweighted mean of six**. Walkthrough still the pre-planner recording; not treated as available.

---

## Summary table (deploy45 / `2c4db0a`)

| Criterion | deploy44 | deploy45 | One-line verdict |
| --- | ---: | ---: | --- |
| Use of Qloo API | 7.5 | **7.5** | Unchanged. A deeper Qloo signal (taste twin lift) was backtested and rejected. |
| Agentic behavior | 8.0 | **8.25** | On a live non-demo production run gpt-4o-mini reordered the top 5 with stated, evidence-backed reasons, visible on the page. Held back: the review backtest is still neutral and the model took every lift it could rather than declining any. |
| Technical execution | 9.0 | **9.0** | Unchanged. |
| Originality | 7.0 | **7.0** | Unchanged. |
| Real-world usefulness | 8.0 | **8.0** | Unchanged. |
| Presentation | 7.5 | **7.5** | Valid HTML (no button inside a link), a clear review callout, report ready in about 1.1 to 1.3 s at 390 px. Held back: gallery and walkthrough unchanged (owner hold). |

**Composite:** (7.5 + 8.25 + 9.0 + 7.0 + 8.0 + 7.5) / 6 = 47.25 / 6 = **7.875**. Below the 7.9 target. See "What would move it further".

---

## What changed in #178

- Review decisions: the server lists every lift the guardrail would accept (`eligibleLifts`, at most 6) and sends that list to gpt-4o-mini, which must call `lift_pitch` or `decline_lift` with a reason. Declines are logged. When nothing is eligible the model is not called. The guardrail itself is unchanged: a pitch may only be lifted above a top 5 pitch that was checked and has no verified local audience overlap, and only when the lifted pitch has some.
- `ReviewDecisionCallout` on the prospecting page states what the review decided and why, with the top 5 before and after. It renders nothing when the review made no decision.
- Eleven `<Button>` inside `<Link>` cases replaced with a styled link (`buttonClassName`).
- `store-distance-copy.test.ts` fixtures no longer depend on the machine time zone.
- `twin_lift_backtest.py`: a rejected alternative lift signal, documented in [`REVIEW_LIFT_BACKTEST.md`](../data/qloo-eval-40/REVIEW_LIFT_BACKTEST.md).

CI 17/17 on #178. Worker 347 tests, web 191, fixtures 72, contracts 10.

## Production verification: live non-demo runs (live Qloo quota)

| Field | deploy44 Bedford | deploy45 Bedford | deploy45 Philadelphia |
| --- | --- | --- | --- |
| Address | 240 Bedford Ave, Brooklyn, NY 11249 | same | 1700 Walnut St, Philadelphia, PA 19103 |
| Job id | `ef293784-aec8-4948-8fa9-21fa1088e459` | `9e82449c-5577-4fb3-956f-98fcf05d1637` | `35e1c18d-38b7-4f38-b716-696e7c378ccf` |
| Created (UTC) | 2026-10-25 15:18 | 2026-10-25 21:49 | 2026-10-25 21:50 |
| Eligible lifts | not computed | 4 | 0 |
| Review | model, kept the top 5 | model, 2 calls, 2,963 tokens, no fallback | model planner, review skipped (nothing eligible, 0 calls) |
| Review outcome | "Review kept the ranked top 5." | "Review changed the top 5 with 2 evidence-backed lifts." | "Review kept the ranked top 5: no lift passes the evidence check." |
| Highest invocation (subrequests) | 20 | 24 | 33 |
| Outreach drafts | 3 x gpt-4o-mini | 3 x gpt-4o-mini | 3 x gpt-4o-mini |

Bedford deploy45, logged by the model (`steps[agent_plan].detail.review.actions`):

- `lift_pitch` H&M above Victoria's Secret: "H&M has local audience overlap with Vintage Apparel." Result: H&M moved from #4 to #3 (1 verified local audience overlap); Victoria's Secret was checked and has none.
- `lift_pitch` Vans above Victoria's Secret: "Vans has local audience overlap with Sneakerheads and Jewelry." Result: Vans moved from #5 to #4 (2 verified local audience overlaps).
- Final top 5: Ulta, HomeGoods, H&M, Vans, Victoria's Secret. Standard ranking: Ulta, HomeGoods, Victoria's Secret, H&M, Vans.

The audiences named in the reasons match the run's own data (`GET /api/analyze/ae8b4379-9b85-4593-9672-21e291fc6975`: H&M `Vintage Apparel`; Vans `Sneakerheads`, `Jewelry`; Victoria's Secret checked, none). The deploy44 Bedford run ranked the same top 5, but at deploy44 the model kept the order without being shown which moves were allowed.

Local captures (not gallery): `shots45/bedford45-run-1440.png`, `shots45/bedford45-receipt-1440.png`, `shots45/bedford45-job.json`, `shots45/philly45-run-1440.png`, `shots45/philly45-job.json`.

## Backtests (offline)

- Review lift (shipped guardrail, 3 demo chips): 0 valid lifts, neutral. Unchanged.
- Taste twin lift (new, rejected): lift a brand present at 3 or more of a site's 5 taste twins above a top 5 brand present at none, thresholds fixed in advance. 0 lifts on 40 sites at the preset and at 3 sensitivity settings. P@3 0.983, P@5 0.95, P@10 0.885 unchanged. Not shipped.
- Taste twins K=5 and blend: unchanged from [`RUBRIC_AUDIT_DEPLOY43.md`](RUBRIC_AUDIT_DEPLOY43.md).

## Smoke (deploy45, GET only)

`smoke45.mjs` (Playwright, 1440 and 390): 22 of 22 pages clean, `pagesBad: []`; pitch 5/5 (LEASING BRIEF); 0 HTTP 429; 0 CSP; 0 console errors; 0 UI dashes; 0 buttons inside links; report pages "Recorded demo"/"Recorded" with 0 POSTs, 0 analyze calls and exactly 1 demo GET each; pipeline and watchlist persist; both prospecting pages show the planner steps and review section; the Bedford page shows the review callout at 1440 and 390.

Report load at 390 px, from navigation to the recorded run strip (includes waiting for network idle): Wicker 1.07 s, Boulder 1.32 s, Sevierville 1.24 s. The 35 s seen in deploy44 was the smoke script waiting for `agent-run-strip`, which only exists after the strip is expanded; the product was not slow.

Live Qloo quota used in the current window (`live-qloo-judge:2026-10-25`): **8 of 48** (2 for this audit).

---

## 1. Use of Qloo API: **7.5 / 10** (unchanged)

No new Qloo calls in production. The twin lift signal was tested on all 40 eval sites and never fired, so it was not shipped. Claiming deeper use would not match production.

## 2. Agentic behavior: **8.25 / 10** (deploy44: 8.0)

Up: deploy44 held back because production had no example of the model reviewer reordering. On deploy45 the Bedford live run shows gpt-4o-mini choosing two lifts from the four the server allowed, each with a reason that names the real overlapping audience, and the final top 5 differs from the standard ranking. On Philadelphia nothing was eligible and no model call was made, so the review does not reorder without evidence. Not higher: the review backtest is still neutral, the model used the full lift budget rather than weighing and declining any pair, and its reasons restate the evidence rather than add judgment.

## 3. Technical execution: **9.0 / 10** (unchanged)

The budget test now feeds realistic audience data so the review model call is still exercised; all invocations stay at or under 45 in CI and at most 33 in production. Not raised: `/api/analyze` is still single invocation.

## 4. Originality: **7.0 / 10** (unchanged)

No new idea shipped.

## 5. Real-world usefulness: **8.0 / 10** (unchanged)

The callout tells a broker why the order changed, but the backtest gives no evidence that the changed order leads to better pitches.

## 6. Presentation: **7.5 / 10** (unchanged)

Fixed: invalid HTML in 11 places, a time zone dependent test, and a misleading load measurement (real 390 px report load is about 1.1 to 1.3 s). Added a clear review callout. Not raised: these are hygiene and one small component; the Devpost gallery and README screenshots are deliberately not retaken and the walkthrough is still stale, which is what held this score at 7.5.

---

## What would move it further

7.9 needs 47.4. Honest next gains: a review backtest on the 40 site panel with real per-site overlap data showing positive lift (Agentic, Usefulness), a fresh walkthrough and gallery once the owner lifts the hold (Presentation), or a new Qloo signal that improves the panel backtest (Qloo, Originality).

## Mapping to official Devpost buckets

| Bucket | deploy44 | deploy45 | Note |
| --- | ---: | ---: | --- |
| Technological Implementation | 9.0 | **9.0** | Unchanged. |
| Design | 7.5 | **7.5** | Callout and HTML fixes; media unchanged. |
| Potential Impact | 8.0 | **8.0** | Unchanged. |
| Quality of Idea | 7.25 | **7.25** | Unchanged. |

## Quick verification checklist (deploy45 / `2c4db0a`)

- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/health` shows `gitSha` `2c4db0a`, `mode` `live`, `liveOffload` `loopback`.
- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/prospecting/9e82449c-5577-4fb3-956f-98fcf05d1637` shows `review.planner: "model"`, `review.eligibleLifts: 4`, two `lift_pitch` actions with `outcome: "lifted"`, and `review.outcome.top5Changed: true`.
- UI: https://leaseup-59m.pages.dev/prospect/9e82449c-5577-4fb3-956f-98fcf05d1637 shows "Agent review (gpt-4o-mini) changed the top 5".
- Rollback: deploy44 Worker `78a2ee89-d941-4d68-9eae-ccaf4a927464` + Pages `a2a0e38d-b69e-4e57-be8b-cf67d8c77cea`.

## Revision history

- deploy45 / `2c4db0a`: 7.875 (this audit).
- deploy44 / `72e9481`: 7.833.
- deploy43 / `ede0644`: 7.708.
- deploy41 / `234364e`: 7.625.
- deploy39 / `a0d15e4`: 7.375.
- deploy34 / `84971a5`: 7.25.
