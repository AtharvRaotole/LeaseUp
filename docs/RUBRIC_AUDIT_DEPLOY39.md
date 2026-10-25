# Qloo Agentic Hackathon: judge rubric audit (LeaseUp), deploy39

**Locked rubric:** this audit reuses [`RUBRIC_AUDIT_OCT24.md`](RUBRIC_AUDIT_OCT24.md) (PR #158, merge `6ec1a14`) without changes: the same six criteria, the same unweighted mean, the same anchors (its "Five highest-leverage improvements" table), the same Devpost bucket mapping and the same method (production first, then code, then README). No criterion is added, dropped, reweighted or reinterpreted.

**Current audit baseline:** production **deploy39**. Pages https://leaseup-59m.pages.dev (deployment `029bd9f5`), Worker `GET https://leaseup-worker.issue-atharva.workers.dev/api/health` returned **`gitSha` `a0d15e4`**, **`mode` `live`**, Qloo + OpenAI **configured** (checked on 2026-10-25 UTC before the deploy40 promotion). Integration branch `cursor/leaseup-v1-c429` at **`a0d15e4`** (#168).

**Prior baseline:** deploy34 / **`84971a5`**, composite **7.25** (scores in [Revision history](#revision-history-deploy34-84971a5)).

**Primary judge path:** `docs/devpost/SUBMISSION.md` "Judge path" and "Live Qloo judge path".
**Official Devpost framing in repo:** `SUBMISSION.md` "Devpost judging criteria (plain English)".

Quoted from the locked rubric:

> **Scoring rule:** 1 = prototype / missing; 10 = best-in-class for a hackathon field. Scores are **not** rounded up. If production behavior contradicts marketing copy, the score follows **production**.

Criteria (verbatim names from the locked rubric): **Use of Qloo API**, **Agentic behavior**, **Technical execution**, **Originality**, **Real-world usefulness**, **Presentation**. Composite = **unweighted mean of six**.

**Walkthrough:** `docs/media/walkthrough.*` is still the pre-planner recording (`docs/media/recording.json` `commitSha` `a6bcd9d`); re-recording stays blocked by the owner hold. This audit does **not** treat a new video as available.

---

## Summary table (deploy39 / `a0d15e4`)

| Criterion | Score /10 | One-line verdict |
| --- | ---: | --- |
| Use of Qloo API | **7.5** | Unchanged since deploy34: live worker with batched `/v2/insights`, 48/day judge cap; demo chips now serve recorded reports with an honest "Recorded demo" badge (#167, #168). |
| Agentic behavior | **6.5** | entityId guard (#161) and honest planner fallback copy (#159) shipped, but every demo chip run shows only **Rule** steps against hardcoded Wicker brand ids, the model planner is not grounded in the panel, there is no replanning after analyze, no outcome proof on the receipt, receipt rows are not asserted in CI, and the rule boost promotes a brand with **zero** audience evidence to #1. |
| Technical execution | **8.75** | Footgun fixed and CI still 17 green jobs; offset by stale `integration-head.txt` (`84971a5`) and a receipt summary that prints a blank brand ("overlap for ."). |
| Originality | **6.75** | No change in approach since deploy34. |
| Real-world usefulness | **7.5** | Reliability sweep (#166, #167) helps, but the live Wicker prospecting pitch order is **worse** than the plain report (Victoria's Secret with 0 local audience overlaps ranked above TJ Maxx with 2), and planner value is still unproven. |
| Presentation | **7.25** | README now embeds a dark-theme production gallery including a prospecting receipt still (#163); but `GALLERY_ASSETS.md` still says deploy34 and carries a "receipt still blocked" TODO that contradicts the README, the receipt still shows the blank-brand bug, and the walkthrough is stale. |

**Composite (unweighted mean of six):** (7.5 + 6.5 + 8.75 + 6.75 + 7.5 + 7.25) / 6 = 44.25 / 6 = **7.375 / 10**. Below the 7.4 target, so improvements were required (see [`RUBRIC_AUDIT_DEPLOY41.md`](RUBRIC_AUDIT_DEPLOY41.md)).

---

## Production verification: live Wicker chip prospecting job (deploy39)

| Field | Value |
| --- | --- |
| Address | `1574 N Milwaukee Ave, Chicago, IL 60622` (Wicker demo chip) |
| Job id | `67ab18a8-26e7-44e9-9da8-93e3cc7739f3`, `mode: live`, created 2026-10-24T15:07:59Z |
| UI | https://leaseup-59m.pages.dev/prospect/67ab18a8-26e7-44e9-9da8-93e3cc7739f3 |
| `agent_plan` summary (API, verbatim) | *Agent ran 3 tool step(s); 1 Qloo call(s); results feed analysis.* |
| Planner rows (API `agentSteps`) | all `planner: "rule"`: `qloo_brand_insights` (224 brands); `nearest_store_check` on hardcoded `2D890327` (*Nearest store 1.92 km (ATP/OSM disagree)*); `enrich_site_stratum` on hardcoded `D3310425` (*no verified trade-area taste overlap for D3310425-...*) |
| Top 5 (API `explain_top5`) | Victoria's Secret, TJ Maxx, J.Crew, H&M, Vans |
| Same site, recorded report `/api/demo-report/wicker` | TJ Maxx (2 local audience overlaps), Victoria's Secret (0), J.Crew (0), H&M (0), Vans (2) |

**Findings that drive the scores:**

- **Rule-only, hardcoded:** `DemoProspectingPlannerClient` (`apps/worker/src/lib/prospecting-agent-planner.ts`) is used for every demo chip address, even in live mode, and always checked two hardcoded Wicker brand ids (also on Boulder and Sevierville). The summary still says "Agent ran".
- **No-evidence boost regression:** `enrich_site_stratum` added its brand to `stratumBoostEntityIds` whether or not it found audience overlap (`prospecting-agent-tools.ts`, `prospecting-agent-state.ts`); `generateProspects` sorts boosted brands first (`services/analysis.ts`). Result: Victoria's Secret (0 overlaps) jumped to #1.
- **Receipt bug:** the web sanitizer strips the UUID from "...overlap for D3310425-...", leaving "overlap for ." in the receipt and in `docs/devpost/gallery/prospecting-receipt-1440.png`.
- **Model planner not grounded:** the OpenAI planner only sees "Qloo returned N brand insights", so any `entityId` it picks for follow-up tools is not taken from the panel.

---

## 1. Use of Qloo API: **7.5 / 10** (deploy34: 7.5)

- Evidence: health `mode: live`, `providers.qloo: configured`; batching, explainability, heatmap, Qloo-down fallback unchanged; recorded chip reports labeled honestly.
- Limits (unchanged from the locked rubric): demo chips are recorded JSON; raw Qloo still loses to chain size on mean top-10 presence (54% / 76% / 83% blend, `aggregates.json`); heatmap does not rank site pitches.

## 2. Agentic behavior: **6.5 / 10** (deploy34: 6.0)

- Anchors applied: improvement #2 (entityId guard, #161) **done**; #3 (fallback banner and reason, #159) **done**; #1 (Playwright receipt rows) **not done in CI** (`e2e/features.spec.ts` asserts receipt rows but is not run by any CI job, and still targets the removed `agent-receipt-tool-agent_plan-` test id); #5 (prove the planner changes outcomes) **not done**.
- Deductions held against the anchor credit: the boost regression above makes the planner's one measurable effect a **harmful** one on the Wicker chip, and chip runs are Rule-only with hardcoded ids. Net **+0.5**, not the full +0.75.

## 3. Technical execution: **8.75 / 10** (deploy34: 8.75)

- Evidence: 17 CI jobs green on #168; entityId footgun removed.
- Limits: `docs/devpost/integration-head.txt` = `84971a5` (stale by 12 merges); blank-brand receipt text; receipt e2e outside CI.

## 4. Originality: **6.75 / 10** (deploy34: 6.75)

- No new mechanism since deploy34; dark redesign is presentation, not originality.

## 5. Real-world usefulness: **7.5 / 10** (deploy34: 7.5)

- Gains: pipeline workspace id survives cross-site cookies, resilient pitch reads (#166), recorded chip reports never burn the daily cap (#167).
- Losses: the prospecting pitch order on Wicker promotes a no-evidence brand to #1; planner value still unproven. Net unchanged.

## 6. Presentation: **7.25 / 10** (deploy34: 7.0)

- Gains: README production gallery (dark theme) with a live prospecting receipt still (#163), which is half of anchor #4.
- Limits: `docs/devpost/GALLERY_ASSETS.md` still titled deploy34, captured at `81a0b49`, and says the receipt still is blocked, which contradicts the README; the committed receipt still shows the "overlap for ." bug; walkthrough still `a6bcd9d`. Credit **+0.25** of the +0.5 anchor.

---

## Mapping to official Devpost buckets

| Devpost criterion | Implied score | Notes |
| --- | ---: | --- |
| Technological Implementation | **8.5** | Same stack; planner effect is negative on the chip run. |
| Design | **7.5** | Dark redesign is clean; receipt bug visible in gallery. |
| Potential Impact | **7.5** | Reliability fixes; pitch order regression on prospecting. |
| Quality of Idea | **7** | Unchanged. |

---

## Improvements chosen after deploy39 (shipped in deploy40 and deploy41) (smallest real set, weakest categories first)

| # | Change | Size | Targets (locked anchors) | Safe scope |
| --- | --- | --- | --- | --- |
| 1 | **Review after ranking**: after the DAG ranks, a reviewer (rule on chips; gpt-4o-mini `lift_pitch` tool on live non-chip runs, with a rule fallback) may lift an evidence-backed pitch above a top-5 pitch with no local audience evidence. A server guardrail rejects any other move. The receipt shows top 5 before and after. | **M** | Agentic (#5, +0.75), Real-world (#5, +0.25) | No extra Qloo calls (asserted in tests); no layout change beyond one receipt section. |
| 2 | **Evidence-gated boost** and planner fixes: boost only on verified overlap, rule planner uses the run's own top panel brand, model planner sees the top 12 panel brands with ids, brand names (not ids) in summaries, "Rule planner ran" on Rule-only runs. | **S** | Agentic, Real-world, Technical | Worker only. |
| 3 | **Receipt e2e in CI**: `e2e/prospecting-receipt-review.spec.ts` inside the existing Wicker broker e2e job (job count stays 17). | **S** | Agentic (#1, +0.5), Technical (#1, +0.25) | Test only. |
| 4 | **Gallery and head refresh**: new production receipt still with the review, `GALLERY_ASSETS.md` rewritten for deploy41, `integration-head.txt` updated. | **S** | Presentation (#4, remaining +0.25) | Stills only; no video. |

**Still blocked:** walkthrough re-record (owner hold).

---

## Quick verification checklist (deploy39 / `a0d15e4`)

1. `curl -sS https://leaseup-worker.issue-atharva.workers.dev/api/health` returns `gitSha` **a0d15e4**, `mode` **live**.
2. `curl -sS https://leaseup-worker.issue-atharva.workers.dev/api/prospecting/67ab18a8-26e7-44e9-9da8-93e3cc7739f3`: `agent_plan.detail.agentSteps[*].planner` all `rule`; `explain_top5.summary` starts with Victoria's Secret.
3. `curl -sS https://leaseup-worker.issue-atharva.workers.dev/api/demo-report/wicker`: Victoria's Secret has no `tradeAreaTaste.audiences`; TJ Maxx has 2.
4. `docs/devpost/integration-head.txt` reads `84971a5`; `docs/devpost/GALLERY_ASSETS.md` heading says deploy34.
5. `git grep -n "receipt" a0d15e4 -- .github/workflows scripts/run-*-e2e.mjs` finds no receipt spec in CI at deploy39.

---

## Revision history (deploy34 / `84971a5`)

| Criterion | Score at deploy34 (`RUBRIC_AUDIT_OCT24.md`) | deploy39 |
| --- | ---: | ---: |
| Use of Qloo API | 7.5 | 7.5 |
| Agentic behavior | 6.0 | 6.5 |
| Technical execution | 8.75 | 8.75 |
| Originality | 6.75 | 6.75 |
| Real-world usefulness | 7.5 | 7.5 |
| Presentation | 7.0 | 7.25 |
| **Composite** | **7.25** | **7.375** |

Shipped between deploy34 and deploy39: #159 planner-first receipt and fallback copy, #160 nearest-store reconcile fix, #161 entityId guard, #163 README gallery, #164 dark design system, #165 hero glow, #166 bug sweep, #167 recorded chip reports, #168 honest data badge.

---

*Internal judging prep; not a guarantee of Devpost outcomes. Production behavior verified via worker API GETs on 2026-10-25 UTC.*
