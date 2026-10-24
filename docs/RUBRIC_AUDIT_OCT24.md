# Qloo Agentic Hackathon — judge rubric audit (LeaseUp)

**Audit baseline:** integration branch `cursor/leaseup-v1-c429` at commit **`de81870`** (`Confirm Qloo lift P@10 after OSM retile; align eval copy (#152)`).  
**Live product (demo mode):** https://leaseup-59m.pages.dev  
**Primary judge path:** `docs/devpost/SUBMISSION.md` § “Judge path (try the product + where to verify)”.  
**Official Devpost framing in repo:** same file § “Devpost judging criteria (plain English)” — Technological Implementation, Design, Potential Impact, Quality of Idea. This audit also scores the six lenses requested for the hackathon (Qloo API, agentic behavior, technical execution, originality, real-world usefulness, presentation).

**Scoring rule:** 1 = prototype / missing; 10 = best-in-class for a hackathon field. Scores are **not** rounded up for enthusiasm. Where the product is strong but **not** what the criterion measures (e.g. great eval but weak “agentic”), the score reflects that gap.

---

## Summary table

| Criterion | Score /10 | One-line verdict |
| --- | ---: | --- |
| Use of Qloo API | **7.0** | Deep brand insights + explainability + heatmap on brand reverse; heatmap **not** used to rank site pitches; judges mostly see **recorded** Qloo on three chips. |
| Agentic behavior | **5.0** | Fixed multi-step prospecting orchestration + optional GPT copy; **no** tool-using planner, reflection, or autonomous decision loop. |
| Technical execution | **8.5** | Split Cloudflare stack, 17-job CI, preregistered 40-site eval, store-truth audits; bounded panel (227 chains) and partial OSM coverage. |
| Originality | **6.5** | Retail pitch workflow is familiar; **honest** negative result on raw Qloo + fitted blend is a differentiator, not a novelty gimmick. |
| Real-world usefulness | **7.0** | Credible broker loop (report → pitch → pipeline); evidence is backtest presence, not leases; US retail-only scope. |
| Presentation | **6.5** | Polished report UX and plain copy; repo media and some Devpost assets **lag** integration head; video capture explicitly on hold in `SUBMISSION.md`. |

**Composite (unweighted mean of six):** **6.8 / 10** — strong engineering and honesty; weaker fit to the word **“agentic”** and to “Qloo alone wins the ranking” narratives judges might assume.

---

## 1. Use of Qloo API — **7.0 / 10**

### What works (evidence)

- **Site analyze:** Worker batches **`GET /v2/insights`** with `filter.type=urn:entity:brand`, WKT location, up to **45 entity IDs per request** across **227** tracked chains (`apps/worker/src/providers/qloo.ts`, `apps/worker/src/providers/qloo-location.ts`, `apps/worker/src/services/analysis.ts`). Live path documented in `docs/QLOO_API_NOTES.md` and `docs/DEVPOST.md`.
- **Explainability:** Brand insights requested with explainability enabled; UI surfaces taste overlap on **Why this brand** (`apps/web/src/components/report/WhyThisBrandCard.tsx`, `packages/fixtures/src/brand-explainability/`).
- **Trade-area context:** Location tag insights for “who shops here” (`apps/worker/src/lib/trade-area-shoppers.ts`, `apps/web/src/components/report/WhoShopsHereCard.tsx`; e2e `e2e/who-shops-here.spec.ts`).
- **Brand reverse / heatmap:** `/brand/:id` uses **`/v2/insights/heatmap`** with grid fallback (`apps/worker/src/services/brand-reverse.ts`, `apps/worker/src/__tests__/qloo-heatmap.test.ts`; e2e `e2e/features.spec.ts` “brand reverse end to end”).
- **Co-tenancy:** Qloo pairing signals combined with OSM tenants (`apps/web/src/components/report/CoTenancyMixSection.tsx`, `apps/worker/src/__tests__/co-tenancy-pairing.test.ts`).
- **Resilience:** Qloo outage → chain-size ranking + banner (`apps/worker/src/lib/qloo-chain-fallback.ts`, `apps/worker/src/__tests__/qloo-analyze-resilience.test.ts`, `e2e/qloo-down.spec.ts`).

### What limits the score (honest gaps)

- **Default pitch order is not raw Qloo affinity.** Production ranking uses a **fitted logistic blend** (`packages/fixtures/src/eval/live-qloo-lift/logistic-coefficients.json`, `apps/worker/src/lib/analysis-enrichment.ts`). Committed eval: raw Qloo mean top-10 presence **54%** (0.5375) vs chain **76%** (0.76) vs blend **83%** (0.825) — `packages/fixtures/src/eval/live-qloo-lift/aggregates.json`, refreshed Oct 24, 2026 per PR #103 / #152.
- **Heatmap does not drive the site pitch list.** Explicit in `docs/devpost/SUBMISSION.md` feature map and `data/qloo-eval-40/QLOO_LIFT_EVAL.md` (heatmap features did not add ranking lift).
- **Judge demo is mostly fixtures:** Three landing chips serve **recorded** Qloo JSON (`packages/fixtures/src/demo-addresses.ts`, `apps/worker` demo fixtures). Live API requires `QLOO_API_KEY` (`docs/DEPLOY.md`). A judge clicking only chips may never hit the hackathon host.
- **No broader Qloo entity graph** (places, audiences beyond brand insights) as a core loop — brand-centric panel only.

---

## 2. Agentic behavior — **5.0 / 10**

### What works (evidence)

- **“Full prospecting run”** is a **defined pipeline**, not a single `/api/analyze` call: geocode → taste → store scan → OSM verify → rank/backtest → explain top 5 → draft outreach → pitch pack (`apps/worker/src/services/prospecting.ts` `STEP_DEFS`; persisted in D1; routes `apps/worker/src/routes/prospecting.ts`).
- **UI:** Landing **Run full prospecting** (`apps/web/src/pages/LandingPage.tsx`, `data-testid="landing-run-prospecting"`) and report **Run full prospecting** (`apps/web/src/components/report/ReportStickyHeader.tsx`); timeline on `apps/web/src/pages/ProspectingPage.tsx` (`data-testid="prospecting-page"`).
- **E2E:** `e2e/features.spec.ts` — **“full prospecting agent completes on demo chip”** (timeout 300s, expects **Open pitch pack**).
- **Worker tests:** `apps/worker/src/__tests__/prospecting.test.ts`.
- **GPT only on broker intent:** Outreach and some taste copy via `apps/worker/src/providers/openai.ts` (`gpt-4o-mini`); tests in `apps/worker/src/__tests__/openai.test.ts`, `outreach-draft.test.ts`. Not auto-sent (`docs/DEVPOST.md`).

### What limits the score

- Steps are **hard-coded**; the system does not choose tools, replan on failure, or negotiate tradeoffs (e.g. skip OSM when CPU-bound) via an agent policy.
- **No** multi-turn agent memory, **no** MCP/tool schema, **no** human-in-the-loop beyond geocode confirm.
- OpenAI is **template summarization**, not the orchestrator of Qloo calls.
- Hackathon title stresses **“Agentic”**; this entry is closer to **workflow automation** + **evaluated ML blend** — judges looking for autonomous agents will score this criterion down unless the story is framed clearly (orchestrated run, not LLM agent).

---

## 3. Technical execution — **8.5 / 10**

### What works (evidence)

- **Architecture:** React/Vite on Cloudflare Pages + Hono Worker, KV cache, D1 for pipeline/portfolio/prospecting (`docs/ARCHITECTURE.md`, `docs/DEPLOY.md`).
- **CI:** **17** GitHub Actions jobs on `cursor/**` (lint, typecheck, test, worker bundle dry-run, build, CSP, Axe, Qloo-down, watchlist, ranking toggle, Wicker broker report, pipeline CRM/loop, vacancy above-fold, demo pitch smoke, landing hero, Lighthouse CI) — `.github/workflows/ci.yml`.
- **Submission guardrails:** `scripts/check-submission-doc.mjs` ties Devpost numbers to `aggregates.json` and integration head.
- **Store truth:** ATP snapshot + OSM snapshot tiles + wikidata false-absence cross-check (`apps/worker/src/lib/osm-wikidata-absence-crosscheck.ts`, `apps/worker/src/__tests__/false-absence-sweep.test.ts`, `demo-chip-osm-absence-audit.test.ts`).
- **Eval discipline:** 40-address preregistered study, tables in `packages/fixtures/src/eval/results_adaptive.json`, methodology pages (`apps/web/src/pages/MethodologyPage.tsx`), parity tests `packages/fixtures/src/__tests__/qloo-lift-headline-parity.test.ts`.
- **Broker-quality bar:** `e2e/broker-jargon.spec.ts` on `/methodology`, `/pipeline`, report, pitch pack; `e2e/a11y.spec.ts` + Axe job.
- **Performance claims (CI only):** Landing mobile perf median **93**, Wicker report **89** perf / **96** a11y — `docs/qa/a11y-perf.md`, Actions run **40074283024**.

### What limits the score

- **227-chain panel** and **25/227** OSM snapshot brands on demo chips (`docs/devpost/SUBMISSION.md` store verification honesty).
- **Worker CPU** forces precomputed strict eval on demo paths (`docs/DEVPOST.md` “Challenges”).
- **Portfolio e2e** depends on live Nominatim behavior (`e2e/features.spec.ts` “portfolio paste…” — confirmation branch); not fully deterministic for judges.
- **Walkthrough media** recorded at commit `a6bcd9d` (Oct 23), not `de81870` — `docs/media/recording.json`.

---

## 4. Originality — **6.5 / 10**

### What works (evidence)

- **Epistemic honesty:** Product and docs lead with “raw Qloo does **not** beat chain size” and still ship a defensible blend (`docs/devpost/SUBMISSION.md` § Quality of Idea; in-app `QlooRankingToggle` — `e2e/qloo-ranking-toggle.spec.ts`).
- **Niche workflow:** Landlord/broker **pitch list** with vacancy math, pipeline CRM, owner-update share — not a generic chat wrapper (`apps/web/src/pages/PipelinePage.tsx`, `e2e/pipeline-loop.spec.ts`, `e2e/pipeline-crm.spec.ts`).
- **Brand reverse** heatmap mode is a second product surface (`/brand/:id`).

### What limits the score

- “Address → ranked retail tenants using taste API” is a **common hackathon pattern**.
- Agentic layer is **not** architecturally novel (fixed DAG).
- Differentiation is **rigor and broker UX**, not a new Qloo capability showcase.

---

## 5. Real-world usefulness — **7.0 / 10**

### What works (evidence)

- **End-to-end broker artifacts:** Report summary (`e2e/report-brands-visible.spec.ts`, `e2e/wicker-broker-report.spec.ts`), shareable pitch (`e2e/demo-pitch-smoke.spec.ts` → https://leaseup-59m.pages.dev/pitch/demo-boulder-ulta), pipeline with status/notes/reminders (`e2e/pipeline-crm.spec.ts`), watchlist (`e2e/watchlist.spec.ts`).
- **Operational honesty:** Adaptive **3 km** absence floor on dense sites (`prospectAbsenceRadiusKm`, `e2e` funnel copy tests in `apps/web/src/__tests__/prospect-funnel-copy.test.ts`); nearest-store ATP/OSM reconcile (`apps/worker/src/lib/nearest-store-reconcile.ts`).
- **Mid-size tier story** matches landlord outreach reality (P@5 **0.53 vs 0.23** in tier Q3 — `data/qloo-eval-40/QLOO_LIFT_EVAL.md`).
- **13** content-verified brand real-estate URLs (`brand-real-estate.json`, `scripts/check-brand-real-estate-urls.mjs`).

### What limits the score

- **No** paying broker validation, **no** lease-outcome data; P@10 is **presence in trade area**, not signed deals (`SUBMISSION.md` “How to read the backtest numbers”).
- Live analyze without keys is **not** the default judge path.
- US-only, English, retail chains panel — excludes many real landlord asset types.

---

## 6. Presentation — **6.5 / 10**

### What works (evidence)

- **Live demo** stable at https://leaseup-59m.pages.dev with **Demo data** badge; one-click Wicker chip → report (`SUBMISSION.md` table).
- **Plain-language** methodology and `/methodology/qloo` (`apps/web/src/pages/HowLeaseUpUsesQlooPage.tsx`).
- **Screenshot library** under `docs/screenshots/` referenced in submission (report summary, broker comprehension, pipeline).
- **Repo walkthrough** files exist (`docs/media/walkthrough.mp4`, `docs/DEVPOST.md`).

### What limits the score

- **Recording hold:** `SUBMISSION.md` — no new video/screenshots until owner authorizes (`LEASEUP_RECORDING_AUTHORIZED=1`).
- **Stale capture:** `docs/media/recording.json` → `commitSha` **a6bcd9d** (Oct 23), predates eval copy refresh at **de81870**; walkthrough may omit **Compare ranking** / refreshed proof copy.
- **Landing hero** is a **static Wicker product still**, not the recorded hero loop (`SUBMISSION.md` feature map → `LandingHeroProductPreview.tsx`; `e2e/landing-hero-preview.spec.ts` tests still).
- Judges who only watch Devpost video may see **older** UX than integration head.

---

## Mapping to official Devpost buckets (repo copy)

| Devpost criterion | Implied score | Notes |
| --- | ---: | --- |
| Technological Implementation | **8** | Aligns with technical execution + Qloo integration depth. |
| Design | **7.5** | Compact report, tour, toggles, broker jargon pass; not a visual redesign showcase. |
| Potential Impact | **7** | Clear landlord pain; impact unproven in market. |
| Quality of Idea | **7** | Strong if judges value honesty; weaker if they want “Qloo beats everything” stories. |

---

## Five highest-leverage improvements (weakest sub-scores first)

Ordered by expected lift to **agentic behavior**, **presentation**, and **Qloo API** perception — **no UI redesign** (layout/components stay; copy, media, routing, and backend behavior only). All feasible on **Cloudflare free tier** (Pages + Worker + D1/KV within limits; no new paid hosts).

| # | Change | Size | Targets | Safe scope |
| --- | --- | --- | --- | --- |
| 1 | **Re-record `docs/media/walkthrough.*` on production** at current integration head: 60s path = Wicker chip → **Compare ranking** toggle (83% vs 76%) → pipeline add → `/pitch/demo-boulder-ulta`. Update `recording.json` commit SHA. | **M** | Presentation (+0.5–1.0), Real-world (+0.25) | `pnpm record:demo` after owner sets `LEASEUP_RECORDING_AUTHORIZED=1`; no deploy beyond existing Pages branch. |
| 2 | **Agent transcript artifact:** On prospecting job complete, persist a short **step log** (JSON or markdown) downloadable from `/prospect/:id` — inputs, which APIs ran, timings, no LLM fiction. Document in `SUBMISSION.md` as “agent receipt.” | **M** | Agentic (+1.0), Presentation (+0.25) | D1 column or KV blob; reuse existing `ProspectingJob` steps (`prospecting.ts`); e2e assert log contains `taste` + `verify_osm`. |
| 3 | **Judge-only live Qloo path (docs + env):** Document one **live-mode** address (not a demo chip) in `SUBMISSION.md` with expected latency and “Demo data off” steps; optional Worker flag to allow **one** cached live analyze/day without key in browser (server-side key only). | **S** | Qloo API (+0.5), Presentation (+0.25) | Docs-first; tiny route guard + KV quota; no UI layout change. |
| 4 | **Prospecting default CTA in judge path:** Move “Run full prospecting” into the **SUBMISSION.md 60s table** as step 1b (same landing field, no new components). Add `e2e/broker-journey.spec.ts` assertion that timeline reaches `pitch_pack` on Wicker. | **S** | Agentic (+0.5), Presentation (+0.25) | Copy + test only; button already exists (`landing-run-prospecting`). |
| 5 | **Optional Qloo enrichment policy (rule-based “agent”):** After analyze, Worker chooses **one** extra Qloo call by stratum (e.g. dense → trade-area tags only; suburban → pairing for top prospect) under existing `analysis-step-budget.ts` CPU cap; log choice in analyze metadata. | **L** | Agentic (+0.75), Qloo API (+0.25) | No new UI; metadata surfaced in existing “How we know” JSON/debug strip or methodology footnote. |

**Explicitly not recommended for this hackathon slice:** inflating eval percentages; claiming heatmap-driven ranking; auto-sending outreach; redesigning the report layout.

---

## Quick verification checklist for judges (at `de81870`)

1. https://leaseup-59m.pages.dev → **Wicker Park, Chicago** → report loads (`report-summary`, `brands-to-pitch`).
2. **How we know** → **Compare ranking** → `e2e/qloo-ranking-toggle.spec.ts`.
3. https://leaseup-59m.pages.dev/pitch/demo-boulder-ulta → `e2e/demo-pitch-smoke.spec.ts`.
4. **Pipeline** after add → `e2e/pipeline-loop.spec.ts`.
5. **Methodology** cohort percents match `aggregates.json` (54 / 76 / 83%) — `MethodologyPage.tsx` + `loadLiveQlooLiftAggregates()`.
6. **Full prospecting** from landing → `e2e/features.spec.ts` (long-running).

---

*Generated for internal judging prep; scores are opinions tied to repository evidence at `de81870`, not a guarantee of Devpost outcomes.*
