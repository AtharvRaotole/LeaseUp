# Qloo Agentic Hackathon — judge rubric audit (LeaseUp)

**Current audit baseline:** production **deploy34** — Pages https://leaseup-59m.pages.dev, Worker `GET https://leaseup-worker.issue-atharva.workers.dev/api/health` → **`gitSha` `84971a5`**, **`mode` `live`**, Qloo + OpenAI **configured** (verified 2026-10-24 UTC). Integration branch: `cursor/leaseup-v1-c429` at **`84971a5`** (`Bounded prospecting agent planner` #156, `Agent receipt` #155).

**Prior baseline (superseded):** **`de81870`** — scores in [Revision history](#revision-history-de81870) below.

**Primary judge path:** `docs/devpost/SUBMISSION.md` § “Judge path” and § “Live Qloo judge path”.  
**Official Devpost framing in repo:** `SUBMISSION.md` § “Devpost judging criteria (plain English)”.

**Scoring rule:** 1 = prototype / missing; 10 = best-in-class for a hackathon field. Scores are **not** rounded up. If production behavior contradicts marketing copy, the score follows **production**.

**Walkthrough:** Re-recording `docs/media/walkthrough.*` remains **blocked** by owner hold in `SUBMISSION.md` (`LEASEUP_RECORDING_AUTHORIZED=1` not set). This audit does **not** treat a new video as available.

---

## Summary table (deploy34 / `84971a5`)

| Criterion | Score /10 | One-line verdict |
| --- | ---: | --- |
| Use of Qloo API | **7.5** | Production worker is **live** with batched `/v2/insights`; judge quota + Bedford live path documented; landing **demo chips** still recorded JSON on Pages. |
| Agentic behavior | **6.0** | **gpt-4o-mini** tool loop + **Agent receipt** ship (#155–#156); production shows **Agent** lines with reasons on live runs, but loop is shallow, mostly duplicates analyze, and **no Playwright proof** on receipt in prod. |
| Technical execution | **8.75** | Same strong CI/eval stack as before plus planner tests, live quota, receipt UI; planner tool calls can be **semantically weak** (e.g. presence lookup without `entityId`). |
| Originality | **6.75** | Honest eval + broker CRM unchanged; **planner/receipt** adds differentiation but not a novel agent architecture. |
| Real-world usefulness | **7.5** | Receipt + pipeline loop help auditability; planner impact on pitch order **not proven** on the live Bedford run. |
| Presentation | **7.0** | Devpost **gallery still deploy33** (`docs/devpost/GALLERY_ASSETS.md`); agent receipt preview is offline fixture route; walkthrough media still **stale** (blocked). |

**Composite (unweighted mean of six):** **7.25 / 10** — meaningful agent surface area since `de81870`, still not a deep autonomous agent; Qloo story remains “blend + footprint checks,” not raw affinity winning.

---

## Production verification: live prospecting + Agent receipt (2026-10-24)

**Goal:** One **non-demo** prospecting job under the **48/day** live Qloo judge quota (`apps/worker/src/lib/live-qloo-judge-quota.ts`), then confirm whether the **Agent receipt** shows **Rule / Agent** planner decisions with substantive reasons.

| Field | Value |
| --- | --- |
| Address | `240 Bedford Ave, Brooklyn, NY 11249` (40-address panel; `SUBMISSION.md` live judge path) |
| Job id | `92dd9de5-2aff-4810-9b81-23ebd286e205` |
| Worker API | `POST /api/prospecting` → `POST /api/prospecting/:id/run` (SSE) on `leaseup-worker.issue-atharva.workers.dev` |
| UI | https://leaseup-59m.pages.dev/prospect/92dd9de5-2aff-4810-9b81-23ebd286e205 |
| `agent_plan` | `mode: "agent"`, summary: *Agent ran 3 tool step(s); 2 Qloo call(s)* |
| Receipt UI | `[data-testid="agent-receipt"]` visible; **3** `[data-testid^="agent-receipt-tool-agent_plan-"]` rows |
| Planner labels | All **Agent** (OpenAI `planner: "model"`); **no Rule rows** on this live run |
| Example reasons (verbatim from API `agentSteps`) | (1) *To understand brand affinity in the Brooklyn area for better retail prospecting.* → `qloo_brand_insights`. (2) *To check for existing store presence within a 10 km radius…* → `store_presence_lookup` → *No stores within 10 km.* (3) *To gather additional taste enrichment…* → `enrich_site_stratum`. |

**Screenshot (this audit run):** `/opt/cursor/artifacts/screenshots/rubric-audit-deploy34-live-bedford-receipt.png` (full prospecting page with receipt expanded).

### Discrepancy vs earlier deploy34 screenshot (no Rule/Agent lines)

| Observation | Interpretation |
| --- | --- |
| Offline **preview** receipt uses `DEMO_PROSPECTING_RECEIPT_JOB` (`apps/web/src/lib/demo-prospecting-receipt-fixture.ts`, route `/__preview/prospecting-receipt`) with **Rule + Agent** mix — **not** production D1 jobs. | Gallery/preview stills can **overstate** Rule-labeled steps judges see on **live** worker (`APP_MODE=live` uses `OpenAiProspectingPlannerClient`, not `DemoProspectingPlannerClient` — `prospecting-agent-planner.ts`). |
| Receipt **tool decision rows** render only when `agent_plan.detail.agentSteps[]` is populated (`apps/web/src/lib/agent-receipt.ts` `parseAgentToolDecisions`). | **`dag_fallback`** with `agentSteps: []` yields a receipt **without** Rule/Agent sub-lines (only the step summary). |
| This audit’s live job **does** show Agent sub-lines with reasons. | If an earlier deploy34 capture showed none, likely causes: **incomplete job**, **fallback planner**, **receipt collapsed**, or **pre-#155 UI** — not reproduced on job `92dd9de5…` at `84971a5`. |

**Honest limits on this run:**

- `store_presence_lookup` was invoked **without `entityId`** (`prospecting-agent-tools.ts`); summary *No stores within 10 km* is **not** a full-panel store audit and can mislead if read as ground truth.
- **Rule**-labeled decisions appear in **unit tests** and the **demo receipt fixture**, not on the verified live Bedford job.
- **DAG impact** (different pitch order vs no planner) is proven **offline** on Wicker (`apps/worker/src/__tests__/prospecting-agent-dag-impact.test.ts`), **not** re-measured on this live job.

---

## 1. Use of Qloo API — **7.5 / 10** (was 7.0 at `de81870`)

### Evidence

- Production health: **`mode: live`**, **`providers.qloo: configured`**, **`gitSha: 84971a5`** (`/api/health` on worker origin).
- Live prospecting at Bedford consumed planner Qloo calls (`qloo_brand_insights`, `enrich_site_stratum`) before main analyze (`prospecting.ts` + `prospecting-agent-tools.ts`).
- Documented judge path + **48/day** cap (`SUBMISSION.md`, `live-qloo-judge-quota.test.ts`).
- Unchanged strengths: brand batching, explainability, heatmap on `/brand`, co-tenancy, Qloo-down fallback (`qloo-down.spec.ts`).

### Limits

- Pages UX default remains **Demo data** for three chips; most judges never trigger live Qloo unless they follow the Bedford path or **Run full prospecting** on a non-chip address (worker still live).
- Raw Qloo still **loses** to chain size on mean top-10 presence (**54% / 76% / 83%** blend — `aggregates.json`).
- Heatmap still **does not** rank site pitches.

---

## 2. Agentic behavior — **6.0 / 10** (was 5.0)

### Evidence

- **Planner:** `runProspectingAgentPlanner` + `OpenAiProspectingPlannerClient` (`prospecting-agent-planner.ts`), tools in `prospecting-agent-tools.ts`, budgets in `analysis-step-budget.ts`.
- **Receipt:** `AgentReceipt.tsx`, exports JSON/Markdown (`agent-receipt.ts`); unit tests `apps/web/src/__tests__/agent-receipt.test.ts`.
- **Worker e2e:** `prospecting-agent-e2e.test.ts`, `prospecting-agent.test.ts`, `prospecting-agent-dag-impact.test.ts`.
- **Production:** Live Bedford job above shows **3** tool decisions with natural-language reasons in the receipt UI.

### Limits

- **Not** a general agent: fixed tool menu, tight step/Qloo budgets, no replanning after analyze, no user-facing tool approval.
- On **live** production, planner is **always the model** (when OpenAI configured); **Rule** path is for **demo/offline** deterministic planner — receipt marketing that shows Rule + Agent is **misleading** for live judges unless labeled.
- **No e2e** asserts `agent-receipt-tool-*` on production or local demo prospecting (`e2e/broker-journey.spec.ts` stops at pitch pack link).
- Planner can run **redundant** Qloo work the DAG repeats; measurable order change shown only in **offline** wicker test.

---

## 3. Technical execution — **8.75 / 10** (was 8.5)

### Evidence

- **17** CI jobs unchanged in spirit (lint through Lighthouse); new tests listed above.
- Agent receipt + planner merged with typecheck/lint coverage.
- Live quota prevents judge key exhaustion (`live-qloo-judge-quota.ts`).

### Limits

- `store_presence_lookup` without entity id is a **footgun** (see live Bedford summary).
- Devpost `integration-head.txt` in repo may lag (**81a0b49** in file vs **`84971a5`** on worker) — rely on **health `gitSha`** for deploy34.
- Portfolio e2e still Nominatim-sensitive.

---

## 4. Originality — **6.75 / 10** (was 6.5)

- Planner + auditable receipt are **incremental** on top of the honest-eval broker product; still not a new paradigm.

---

## 5. Real-world usefulness — **7.5 / 10** (was 7.0)

- **Agent receipt** helps brokers/judges see *what ran* (sources + timings + tool reasons).
- Pipeline, pitch pack, verified reach URLs unchanged (`pipeline-loop.spec.ts`, `demo-pitch-smoke.spec.ts`).
- Planner **value** for better pitches on live addresses remains **unverified** in this audit.

---

## 6. Presentation — **7.0 / 10** (was 6.5)

### Evidence

- Production deploy34 serves receipt UI on completed prospecting jobs (verified URL above).
- Devpost gallery PNGs exist (`docs/devpost/gallery/`) — captured deploy33 head **81a0b49**, not **84971a5**.
- `scripts/agent-receipt-screenshots.mjs` captures **preview fixture**, not live worker jobs.

### Limits

- **Walkthrough re-record blocked** (`SUBMISSION.md` recording hold).
- `docs/media/recording.json` still **`a6bcd9d`** — predates planner/receipt.
- No production still of **live** receipt in `docs/devpost/gallery/`.

---

## Mapping to official Devpost buckets

| Devpost criterion | Implied score | Notes |
| --- | ---: | --- |
| Technological Implementation | **8.5** | Planner + receipt + live Qloo path. |
| Design | **7.5** | Receipt is clear; preview vs live labeling could confuse. |
| Potential Impact | **7.5** | Audit trail helps trust; market proof still absent. |
| Quality of Idea | **7** | Honest Qloo use; agent layer is assistive, not core thesis. |

---

## Five highest-leverage improvements (deploy34; weakest first)

Walkthrough re-record remains **out of scope** until owner lifts the hold. No UI redesign — copy, tests, planner behavior, and docs/gallery only. Cloudflare free tier.

| # | Change | Size | Targets | Safe scope |
| --- | --- | --- | --- | --- |
| 1 | **Playwright: assert Agent receipt tool rows** after demo prospecting completes (`agent-receipt`, `agent-receipt-tool-agent_plan-0`) in `e2e/broker-journey.spec.ts` or new spec against local demo worker. | **S** | Agentic (+0.5), Technical (+0.25) | Uses existing UI; no layout change. |
| 2 | **Planner tool validation:** reject or auto-fill `entityId` for `store_presence_lookup` / prefer `nearest_store_check` when top insight exists; update receipt summaries. | **M** | Agentic (+0.5), Real-world (+0.25) | Worker-only (`prospecting-agent-tools.ts` + planner prompt). |
| 3 | **Receipt honesty:** when `agent_plan.detail.mode === 'dag_fallback'`, show explicit banner + fallback reason in receipt (`fallbackReason`); e2e fixture for empty `agentSteps`. | **S** | Presentation (+0.25), Agentic (+0.25) | Copy + conditional UI in `AgentReceipt.tsx`. |
| 4 | **Devpost gallery refresh to deploy34:** add one **live** prospecting receipt still (Bedford or quota-safe address) via `capture-devpost-gallery-prod.mjs` or dedicated script; update `GALLERY_ASSETS.md` head SHA. | **M** | Presentation (+0.5) | Stills only; no video. |
| 5 | **Prove planner changes outcomes:** attach to receipt JSON a hash or top-3 prospect id diff vs baseline DAG (computed in worker on complete); document in `SUBMISSION.md`. | **L** | Agentic (+0.75), Real-world (+0.25) | Extra CPU bounded; no new Qloo calls if diff uses in-memory analyze only. |

**Done since `de81870` (no longer top leverage):** agent receipt (#155), gpt-4o-mini planner (#156), live judge path + quota (#154), prospecting in SUBMISSION 60s table.

**Still blocked:** walkthrough re-record (`LEASEUP_RECORDING_AUTHORIZED=1`).

---

## Quick verification checklist (deploy34 / `84971a5`)

1. `curl -sS https://leaseup-worker.issue-atharva.workers.dev/api/health` → `gitSha` **84971a5**, `mode` **live**.
2. https://leaseup-59m.pages.dev → Wicker chip → `e2e/wicker-broker-report.spec.ts` / `report-brands-visible.spec.ts`.
3. Live Qloo: Bedford address + **Analyze** or **Run full prospecting** (quota) — `SUBMISSION.md` § Live Qloo judge path.
4. Completed prospecting receipt example: `/prospect/92dd9de5-2aff-4810-9b81-23ebd286e205` (see [Production verification](#production-verification-live-prospecting--agent-receipt-2026-10-24)).
5. `/pitch/demo-boulder-ulta` → `e2e/demo-pitch-smoke.spec.ts`.
6. Offline receipt preview (fixture, not production): `/__preview/prospecting-receipt` (`ProspectingReceiptPreviewPage.tsx`).

---

## Revision history (`de81870`)

| Criterion | Score at `de81870` |
| --- | ---: |
| Use of Qloo API | 7.0 |
| Agentic behavior | 5.0 |
| Technical execution | 8.5 |
| Originality | 6.5 |
| Real-world usefulness | 7.0 |
| Presentation | 6.5 |
| **Composite** | **6.8** |

Shipped after that audit: #154 live judge quota, #155 receipt, #156 planner (deploy34).

---

*Internal judging prep; not a guarantee of Devpost outcomes. Production behavior verified via worker API + Playwright on 2026-10-24 UTC.*
