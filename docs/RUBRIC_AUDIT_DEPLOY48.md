# Qloo Agentic Hackathon: judge rubric audit (LeaseUp), deploy48 and deploy49

**Locked rubric:** this audit reuses [`RUBRIC_AUDIT_OCT24.md`](RUBRIC_AUDIT_OCT24.md) without changes: the same six criteria, the same unweighted mean, the same anchors, the same Devpost bucket mapping and the same method (production first, then code, then README). Same rubric as [`RUBRIC_AUDIT_DEPLOY46.md`](RUBRIC_AUDIT_DEPLOY46.md). No category was added.

**Current audit baseline:** production **deploy49**. Pages https://leaseup-59m.pages.dev (deployment `020d6d9e`), Worker version `b43d8b18` at 100% (deployed 2026-10-26 02:29 UTC); `GET https://leaseup-worker.issue-atharva.workers.dev/api/health` returned **`gitSha` `1e16d21`**, **`mode` `live`**, **`liveOffload` `loopback`**, Qloo + OpenAI **configured**. Integration code head **`1e16d21`** (#183 to #187). deploy47 (`0aaa48b`) and deploy48 (`d601ff3`) were intermediate deploys in this cycle.

**Prior baselines:** deploy46 / `4dd8bcb` composite **8.0**; deploy45 / `2c4db0a` **7.875**; deploy44 / `72e9481` **7.833**; deploy43 / `ede0644` **7.708**; deploy41 / `234364e` **7.625**; deploy39 / `a0d15e4` **7.375**; deploy34 / `84971a5` **7.25**.

> **Scoring rule:** 1 = prototype / missing; 10 = best-in-class for a hackathon field. Scores are **not** rounded up. If production behavior contradicts marketing copy, the score follows **production**.

Composite = **unweighted mean of six**. Walkthrough still the pre-planner recording; not treated as available. Gallery and README screenshots are on owner hold and were not touched.

---

## Summary table (deploy49 / `1e16d21`)

| Criterion | deploy46 | deploy49 | One-line verdict |
| --- | ---: | ---: | --- |
| Use of Qloo API | 7.75 | **7.75** | Unchanged. The reviewer reads a panel share derived from Qloo taste twins, but no new Qloo signal or call. |
| Agentic behavior | 8.25 | **8.5** | The reviewer now declines lifts the comparable markets do not back, with a positive model backtest and reasoned declines on a live run. |
| Technical execution | 9.0 | **9.25** | The live analyze route is metered and budget tested under the Workers Free subrequest cap; the meter found a real gap (no offload on analyze) that was closed. |
| Originality | 7.25 | **7.25** | Unchanged. An evidence gated reviewer is a refinement, not a new idea. |
| Real-world usefulness | 8.25 | **8.25** | Unchanged. The Bedford top 5 now changes with stated reasons, but there is no outcome evidence that the changed order wins more deals. |
| Presentation | 7.5 | **7.5** | Unchanged and capped by the owner hold on gallery, README screenshots and walkthrough. |

**Composite:** (7.75 + 8.5 + 9.25 + 7.25 + 8.25 + 7.5) / 6 = 48.5 / 6 = **8.083** (not rounded). The 8.2 target is **not** reached.

---

## What changed

**#183 Review declines lifts the comparable markets do not back** (`0591f79`)

- Each eligible lift now carries `panelMarketShare`, the share of comparable panel markets where the brand trades. Rule: lift only if the lifted brand's share is at least the displaced brand's share minus 10 points; otherwise keep the order and say why. The gpt-4o-mini prompt gets the same evidence and must cite it; a code check rejects model changes that break the rule.
- Backtest (`data/qloo-eval-40/REVIEW_JUDGMENT_BACKTEST.md`), 40 markets, top 10 hits versus the pre review order: recorded gpt-4o-mini replay **+0.175** (95% CI [0, 0.35]), 10 markets better and 3 worse, 46 lifts and 48 declines, 13 good and 1 bad changes. Deterministic rule +0.2 [0.025, 0.375]. The previous take every lift arm: +0.125 [-0.05, 0.325], 17 good and 8 bad. Leave one out nested selection of the margin: +0.2. Caveats: the model lower bound touches zero; store presence is a proxy for fit; the margin was chosen on this panel (nested selection reported to bound that).
- The demo chip review outputs changed (Wicker now 2 lifts and 5 declines; Boulder lifts American Eagle). The frozen walkthrough recording may show the older review text.

**#184 Meter the analyze stream and budget test it under the Workers Free cap** (`23577c5`)

- `/analyze/stream` runs inside `withSubrequestMeter` and emits an `event: subrequests` with fetch, cache, assets and loopback counts; the same counts are logged as `analyze_subrequests`. New CI test `live-analyze-subrequest-budget.test.ts`.

**#185 Live analyze uses the loopback offload, found by the new meter** (`0aaa48b`)

- The meter showed live analyze making every Qloo and OSM call inline: a preview run gave **57** counted subrequests (25 fetch, 24 cache, 8 assets) with 0 loopback, close to the 50 subrequest Free cap. Cause: the analysis service was built from `c.env` without the `LIVE_OFFLOAD` binding. Fix: POST `/analyze` and `/analyze/stream` pass the loopback binding.
- The budget test covers both paths: inline 35 total (limit 45); offload with 2 offload calls, both ok, caller 19.
- Same address on the deploy47 preview after the fix: caller **27** (10 fetch, 8 cache, 7 assets, 2 loopback), offloads trade area taste and co-tenancy all ok.

**#186 Review reasons in plain words for brokers** (`d601ff3`) and **#187 read the displaced share as a plain percent** (`1e16d21`)

- Model reasons used field names ("panelMarketShare of 0.22") and one summary ended in a double period. They now read "H&M's share of panel markets (22%) is below Victoria's Secret's 30% minus 10 points." #187 fixed "Nike's of 24%", seen live on deploy48. Unit tests cover both wordings.

## Production verification (live Qloo quota)

| Field | deploy49 Bedford |
| --- | --- |
| Address | 240 Bedford Ave, Brooklyn, NY 11249 |
| Prospecting job | `179c36e5-78f1-4239-892d-39ac2d2de2ac` (created 2026-10-26 02:29 UTC) |
| Review summary | "Review changed the top 5 with 1 evidence-backed lift (3 eligible lifts declined with a reason; 1 proposed change rejected by the evidence check)." |
| Declines | Kept Victoria's Secret above H&M (22% vs 30%), Nike above Michael Kors (8% vs 24%), Victoria's Secret above Vans (19% vs 30%) |
| Lift | HomeGoods #7 to #5 over Nike (30% vs 24%, 2 verified local audience overlaps; Nike has none) |
| Top 5 | before review Ulta, Victoria's Secret, H&M, Vans, Nike; after Ulta, Victoria's Secret, H&M, Vans, HomeGoods |
| Console errors | 0 |

Earlier runs of the same address this cycle: deploy47 job `14df4ba4-2442-4643-ab8f-7b05bbc4b99a` (4 reasoned declines, same HomeGoods lift, 2 gpt-4o-mini calls, 5,265 tokens; job subrequests 20 total with 3 offloads) and deploy48 job `49b1df78-b12a-40ad-a722-e2e32bd16cdd` (same decisions; showed the "Nike's of 24%" wording that #187 fixed). The model's choice between declining and rejecting Tiffany & Co. varied between runs; the evidence check holds the outcome either way.

This is the first time the Bedford top 5 changed in production; deploy46 showed the same top 5 as deploy45.

Local captures (not gallery): `shots47/bedford47-*`, `shots47/bedford48-*`, `shots47/bedford49-run-1440.png`, `shots47/bedford49-receipt-1440.png`, `shots47/bedford49-job.json`.

Live Qloo quota (`live-qloo-judge:2026-10-26`): **6 of 48** after this audit. The counter was only read.

## Smoke (deploy49, GET only)

`smoke47.mjs` (Playwright, 1440 and 390): 22 of 22 pages clean, `pagesBad: []`; pitch 5/5 (LEASING BRIEF); 0 HTTP 429; 0 CSP; 0 console errors; 0 UI dashes; 0 buttons inside links; report pages "Recorded demo"/"Recorded" with 0 POSTs and 0 analyze calls; pipeline and watchlist persist; both prospecting pages show the planner steps and review section. Report load at 390 px: Wicker 1.24 s, Boulder 1.11 s, Sevierville 1.09 s.

---

## 1. Use of Qloo API: **7.75 / 10** (unchanged)

The new reviewer evidence (`panelMarketShare`) comes from the Qloo taste twin panel, so Qloo data now also decides which lifts are declined. Not higher: no new Qloo endpoint, call or signal; demo chips still use the standard blend.

## 2. Agentic behavior: **8.5 / 10** (deploy46: 8.25)

Up: deploy46 named "a reviewer that declines lifts on evidence, with a positive panel backtest" as the path. The model reviewer now declines about half of eligible lifts with a cited reason, a code check rejects proposals that break the evidence rule, and the recorded model replay beats the take every lift arm (13 good to 1 bad versus 17 to 8; +0.175 versus +0.125). Production shows reasoned declines and a rejected proposal on a live address. Not higher: the model CI lower bound is exactly zero, and the reviewer's decision rule is simple.

## 3. Technical execution: **9.25 / 10** (deploy46: 9.0)

Up: the live analyze path now reports its own subrequest use in production (SSE event and log), CI budget tests cover inline and offload paths against the Free cap, and the meter found and closed a real near cap gap (57 counted to 27 caller side on the same address). 17 of 17 CI on all five PRs. Not higher: the meter is conservative (it counts cache and assets reads), and only one live address pair was measured before and after.

## 4. Originality: **7.25 / 10** (unchanged)

An evidence gated reviewer and a subrequest meter are good engineering, not a new product idea.

## 5. Real-world usefulness: **8.25 / 10** (unchanged)

A broker now sees why a lift was refused in plain words, and the Bedford top 5 changed for the first time. Held because there is still no outcome evidence (meetings, tours, deals) that the reviewed order leads to better pitches; the backtest metric is store presence.

## 6. Presentation: **7.5 / 10** (unchanged)

Review copy is clearer, but gallery, README screenshots and walkthrough are on owner hold and still show older builds; the walkthrough review text may now differ from the live demo chips.

---

## What would move it further

8.2 needs +0.7 summed category points over this audit. Presentation is the largest available gap: fresh gallery and README stills of the live review declines, receipt and twin ranking plus a re-recorded walkthrough would justify 7.75 to 8.0 (composite 8.125 to 8.167) once the owner lifts the hold. Qloo: twin ranking on the demo chips (changes recorded numbers, so it needs the same re-record). Usefulness: any outcome evidence, such as broker feedback on reviewed pitch lists. Reaching 8.2 honestly likely needs the media hold lifted plus one of the other two.

## Mapping to official Devpost buckets

| Bucket | deploy46 | deploy49 | Note |
| --- | ---: | ---: | --- |
| Technological Implementation | 9.0 | **9.25** | Metered, budget tested live analyze. |
| Design | 7.5 | **7.5** | Unchanged (media hold). |
| Potential Impact | 8.25 | **8.25** | Unchanged. |
| Quality of Idea | 7.5 | **7.5** | Unchanged. |

## Quick verification checklist (deploy49 / `1e16d21`)

- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/health` shows `gitSha` `1e16d21`, `mode` `live`.
- `curl -s https://leaseup-worker.issue-atharva.workers.dev/api/prospecting/179c36e5-78f1-4239-892d-39ac2d2de2ac` shows the review summary with 3 declines and the HomeGoods lift.
- `cd apps/worker && TZ=UTC npx vitest run src/__tests__/live-analyze-subrequest-budget.test.ts src/__tests__/prospecting-agent-review.test.ts`.
- Rollback: deploy48 Worker `06988048-9064-4524-9b2a-3345830cb336` + Pages `30a3ab8e-79c1-401e-8bb3-dc50be0e365a`; cycle start deploy46 Worker `b4690930-dd0f-4a9d-bf2b-41eca7d4b4d3` + Pages `b87fc3f3-6a84-498f-94ff-93c7b1fe6d04`.

## Revision history

- deploy49 / `1e16d21`: 8.083 (this audit).
- deploy46 / `4dd8bcb`: 8.0.
- deploy45 / `2c4db0a`: 7.875.
- deploy44 / `72e9481`: 7.833.
- deploy43 / `ede0644`: 7.708.
- deploy41 / `234364e`: 7.625.
- deploy39 / `a0d15e4`: 7.375.
- deploy34 / `84971a5`: 7.25.
