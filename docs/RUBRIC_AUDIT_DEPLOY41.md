# Qloo Agentic Hackathon: judge rubric audit (LeaseUp), deploy41

**Locked rubric:** this audit reuses [`RUBRIC_AUDIT_OCT24.md`](RUBRIC_AUDIT_OCT24.md) (PR #158, merge `6ec1a14`) without changes: the same six criteria, the same unweighted mean, the same anchors (its "Five highest-leverage improvements" table), the same Devpost bucket mapping and the same method (production first, then code, then README). It is the same rubric used for [`RUBRIC_AUDIT_DEPLOY39.md`](RUBRIC_AUDIT_DEPLOY39.md).

**Current audit baseline:** production **deploy41**. Pages https://leaseup-59m.pages.dev (deployment `801b6a9e`), Worker version `3eaa47c7` at 100%; `GET https://leaseup-worker.issue-atharva.workers.dev/api/health` returned **`gitSha` `234364e`**, **`mode` `live`**, Qloo + OpenAI **configured** (checked 2026-10-25 02:54 UTC). Integration code head **`234364e`** (#170).

**Prior baselines:** deploy39 / `a0d15e4` composite **7.375**; deploy34 / `84971a5` composite **7.25**.

Quoted from the locked rubric:

> **Scoring rule:** 1 = prototype / missing; 10 = best-in-class for a hackathon field. Scores are **not** rounded up. If production behavior contradicts marketing copy, the score follows **production**.

Criteria (verbatim names): **Use of Qloo API**, **Agentic behavior**, **Technical execution**, **Originality**, **Real-world usefulness**, **Presentation**. Composite = **unweighted mean of six**.

**Walkthrough:** still the pre-planner recording (`docs/media/recording.json` `commitSha` `a6bcd9d`); not treated as available.

---

## Summary table (deploy41 / `234364e`)

| Criterion | deploy39 | deploy41 | One-line verdict |
| --- | ---: | ---: | --- |
| Use of Qloo API | 7.5 | **7.5** | No change in how Qloo is used; the review adds no Qloo calls. |
| Agentic behavior | 6.5 | **7.25** | A review step after ranking now changes the production top 5 for a stated, evidence-backed reason, the receipt shows before and after, the no-evidence boost is gone, and receipt rows are asserted in CI. Held back: production chip runs are still Rule-only, the gpt-4o-mini reviewer has not been seen on production, and the review policy is not backtested. |
| Technical execution | 8.75 | **9.0** | Receipt e2e runs inside the existing CI job (still 17 green jobs on #169 and #170); blank-brand and "that brand" receipt copy bugs fixed; `integration-head.txt` current. |
| Originality | 6.75 | **6.75** | A post-rank reviewer is a modest addition, not a new idea class. |
| Real-world usefulness | 7.5 | **7.75** | The Wicker regression is fixed: the pitch with 2 verified local audience overlaps (Vans) now sits above Victoria's Secret (none), and a broker can see why. |
| Presentation | 7.25 | **7.5** | Gallery doc rewritten for current production, stale TODO removed, a clean live receipt still with the review; walkthrough still stale. |

**Composite (unweighted mean of six):** (7.5 + 7.25 + 9.0 + 6.75 + 7.75 + 7.5) / 6 = 45.75 / 6 = **7.625 / 10** (deploy39: 7.375; deploy34: 7.25).

---

## Production verification: live Wicker chip prospecting job (deploy41)

| Field | Value |
| --- | --- |
| Address | `1574 N Milwaukee Ave, Chicago, IL 60622` (Wicker demo chip, started from the landing page) |
| Job id | `2d5bbe6f-be4d-40f5-9810-9e63ba52d2f1`, `mode: live`, created 2026-10-25T02:55:25Z |
| UI | https://leaseup-59m.pages.dev/prospect/2d5bbe6f-be4d-40f5-9810-9e63ba52d2f1 |
| `agent_plan` summary (API, verbatim) | *Rule planner ran 3 tool step(s); 1 Qloo call(s); results feed analysis.* |
| Planner rows (receipt) | *Rule: reconcile the nearest store for the strongest taste match.* / *Result: Nearest Whole Foods Market store 2.01 km.* and *Rule: look for verified local audience overlap for the strongest taste match.* / *Result: Stratum dense_urban: 2 verified local audience overlap(s) for Whole Foods Market.* (brand taken from this run's panel, not hardcoded) |
| Review (API `agent_plan.detail.review`) | `planner: rule`, *Review changed the top 5 with 1 evidence-backed lift.* |
| Review rows (receipt) | *Result: Vans moved from #5 to #2 (2 verified local audience overlaps); Victoria's Secret has none.* |
| Top 5 before review | TJ Maxx, Victoria's Secret, J.Crew, H&M, Vans |
| Top 5 after review (API `explain_top5`) | TJ Maxx, Vans, Victoria's Secret, J.Crew, H&M |
| Console errors | 0 |

Compare deploy39 job `67ab18a8`: hardcoded brand ids, raw UUID in the summary, Victoria's Secret ranked #1 with 0 overlaps.

**Production smoke (GET only, `smoke40.mjs`, 2026-10-25 UTC):** 20 page loads (10 routes at 1440 and 390), **0** bad pages, pitch pages **5/5**, **0** HTTP 429, **0** CSP violations, **0** console errors, **0** analyze POSTs from recorded chip reports, pipeline and watchlist persist across reload. The prospecting route shows 3 planner decisions, the review section with 1 action and no "for ." or "that brand" text at both widths.

---

## 1. Use of Qloo API: **7.5 / 10** (unchanged)

- Evidence: health `mode: live`; batched `/v2/insights`; the review reads `tradeAreaTaste` already fetched in the run (`prospecting-agent-dag-impact.test.ts` asserts no extra Qloo calls).
- Limits (unchanged): recorded chip reports; raw Qloo still loses to chain size on mean top-10 presence; heatmap does not rank site pitches.

## 2. Agentic behavior: **7.25 / 10** (deploy39: 6.5)

- Anchor #1 (Playwright receipt rows): **done in CI**. `e2e/prospecting-receipt-review.spec.ts` runs a demo prospecting job and asserts `agent-receipt`, planner decisions, the review action and before and after lists; it is in `scripts/run-wicker-broker-e2e.mjs`, which CI runs. **+0.5**.
- Anchors #2 and #3: already credited at deploy39; the regression that held part of that credit back (boost with no evidence) is fixed: the boost needs `audienceCount > 0` (`prospecting-agent-tools.ts`, `prospecting-agent-state.ts`). **+0.25**.
- Anchor #5 (prove outcomes change): the receipt and JSON export now carry top 5 before and after review, and on production Wicker the top 3 changes. **No credit taken**, because on production the change comes from the rule reviewer only (demo chips), the gpt-4o-mini `lift_pitch` path has only been exercised in tests, it is a diff against the ranked list before review rather than against a no-planner baseline, and the lift policy has not been backtested.
- Net 6.5 + 0.75 = **7.25**.

## 3. Technical execution: **9.0 / 10** (deploy39: 8.75)

- Evidence: anchor #1 technical **+0.25**; CI runs `40155274878` (#169) and `40155872857` (#170) each 17/17 success; review guardrail (`applyReviewLift`: at most 2 lifts, 3 model turns, 10 s, rule fallback with `fallbackReason`) with 11 unit tests; integration head file current.
- Limits: live model reviewer unverified on production; walkthrough pipeline stale.

## 4. Originality: **6.75 / 10** (unchanged)

## 5. Real-world usefulness: **7.75 / 10** (deploy39: 7.5)

- Evidence: on the same address, the prospecting pitch order now agrees with the local evidence instead of contradicting it; anchor #5 real-world **+0.25** for a visible, explained change a broker can act on.
- Limits: Boulder's review swaps #5 (American Eagle Outfitters for Victoria's Secret) offline; Sevierville unchanged; no backtest that the lifted order predicts openings better.

## 6. Presentation: **7.5 / 10** (deploy39: 7.25)

- Evidence: anchor #4 now complete (**+0.25**, the remaining half): `GALLERY_ASSETS.md` rewritten for deploy41 with the stale "blocked" TODO removed, `prospecting-receipt-1440.png` replaced with a clean live deploy41 still that shows the review, `integration-head.txt` = `234364e`, `SUBMISSION.md` labels updated.
- Limits: walkthrough video still stale (owner hold).

---

## Mapping to official Devpost buckets

| Devpost criterion | deploy39 | deploy41 | Notes |
| --- | ---: | ---: | --- |
| Technological Implementation | 8.5 | **8.75** | Guarded reviewer, receipt e2e in CI. |
| Design | 7.5 | **7.5** | Same look; one receipt section added. |
| Potential Impact | 7.5 | **7.75** | Pitch order follows local evidence. |
| Quality of Idea | 7 | **7** | Unchanged. |

---

## Remaining improvements (not done; would raise scores further)

| # | Change | Targets |
| --- | --- | --- |
| 1 | Show one live non-chip run where the gpt-4o-mini reviewer acts, with its receipt row labeled Agent (uses daily cap). | Agentic |
| 2 | Backtest the review lift on the 40-address eval. | Agentic, Real-world |
| 3 | Re-record the walkthrough when the owner lifts the hold. | Presentation |

---

## Quick verification checklist (deploy41 / `234364e`)

1. `curl -sS https://leaseup-worker.issue-atharva.workers.dev/api/health` returns `gitSha` **234364e**, `mode` **live**.
2. `curl -sS https://leaseup-worker.issue-atharva.workers.dev/api/prospecting/2d5bbe6f-be4d-40f5-9810-9e63ba52d2f1`: `agent_plan.detail.review.summary` = *Review changed the top 5 with 1 evidence-backed lift.*; `explain_top5.summary` = TJ Maxx, Vans, Victoria's Secret, J.Crew, H&M.
3. Open the UI link above: **Review after ranking** shows Top 5 before and after.
4. `grep -n prospecting-receipt-review scripts/run-wicker-broker-e2e.mjs` finds the spec in the CI e2e command.
5. `cat docs/devpost/integration-head.txt` reads `234364e`.

---

## Revision history

| Criterion | deploy34 (`84971a5`) | deploy39 (`a0d15e4`) | deploy41 (`234364e`) |
| --- | ---: | ---: | ---: |
| Use of Qloo API | 7.5 | 7.5 | 7.5 |
| Agentic behavior | 6.0 | 6.5 | 7.25 |
| Technical execution | 8.75 | 8.75 | 9.0 |
| Originality | 6.75 | 6.75 | 6.75 |
| Real-world usefulness | 7.5 | 7.5 | 7.75 |
| Presentation | 7.0 | 7.25 | 7.5 |
| **Composite** | **7.25** | **7.375** | **7.625** |

Shipped between deploy39 and deploy41: #169 review after ranking, evidence-gated boost, panel-grounded planner (deploy40, worker `fa15ed88`, Pages `ebcdcee6`); #170 readable rule planner reasons (deploy41, worker `3eaa47c7`, Pages `801b6a9e`); this docs PR (gallery still, gallery doc, integration head).

---

*Internal judging prep; not a guarantee of Devpost outcomes.*
