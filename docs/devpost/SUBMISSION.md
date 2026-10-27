# Devpost submission draft (LeaseUp)

**Tagline (headline):** Find the right stores for your empty retail space.

**Subhead (Devpost and video opener):** Type in an address. LeaseUp shows which brands people nearby love but can't find close by, and helps you pitch them.

**On the live landing today:** the same headline appears above a short helper line from the app: "Enter an address to see which brands local shoppers want nearby, then check real store locations before you pitch." (`LANDING_PLAIN_SUMMARY` in `apps/web/src/lib/broker-copy.ts`).

**Production reference:** Cloudflare Pages tracks branch **`cursor/leaseup-v1-c429`** (integration). Live production is labeled **deploy50** on that branch (worker version tag deploy50, health `gitSha` `0b1154d`) (Pages URL `https://leaseup-59m.pages.dev`). The current integration head short SHA is in `docs/devpost/integration-head.txt` (CI verifies it is a commit on that branch; see `scripts/check-submission-doc.mjs`). Do not paste stale deploy SHAs in Devpost copy. **Mobile Lighthouse (GitHub Actions LHCI only):** median of **3** mobile runs on `ubuntu-latest` in Actions run [**40074283024**](https://github.com/AtharvRaotole/LeaseUp/actions/runs/40074283024): landing performance **93**; Wicker report performance **89**, accessibility **96** (`docs/qa/a11y-perf.md`, `LHCI_MEDIANS` in the job log). Do not cite local preview Lighthouse scores in Devpost copy.

Offline copy for the Qloo Agentic Hackathon. Numbers below come from `data/qloo-eval-40/QLOO_LIFT_EVAL.md` and `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` (40 US addresses, live Qloo API; metrics refreshed Oct 24, 2026 per PR #103).

**How to read the backtest numbers:** **P@10** is the **share of the top 10 ranked brands that already had a store in the trade area per ATP/OSM** (All The Places plus OpenStreetMap snapshot tiles in the 40-address study, with the density-adaptive eval radius). It is **not** signed leases, lease success, or proof of open whitespace. Plain-language counts are average slots present (multiply P@10 by 10). Exact means are in parentheses where we cite them.

**Pitch absence radius (live product):** When building the pitch list, dense areas use an adaptive absence check with at least a **3 km** floor (for example Wicker at 10 km search uses **3 km** for "already nearby") so brokers do not pitch chains with a store a short drive away (`prospectAbsenceRadiusKm`, `data/qloo-eval-40/ADAPTIVE_RADIUS_TRADE_AREA_AUDIT.md`). The report shows a plain funnel line (`report-prospect-funnel`): brands scored, how many already have a store within that km, and how many fit taste with none (`prospect-funnel-copy.ts`).

**Where Qloo lift shows up (do not oversell raw affinity):** Raw Qloo order does **not** beat national chain size on mean P@10 (**54%** vs **76%** on the 40-address panel; exact **0.5375** vs **0.760** in `packages/fixtures/src/eval/live-qloo-lift/aggregates.json`). The honest lift is from the **fitted logistic taste blend** (**83%** vs **76%**; exact **0.825** vs **0.760**, **+6.5 pp** in the same file) and from **ordering within a chain-size tier** (for example mid-size **P@5 0.53** vs **0.23** in the 439 to 864 store tier per `data/qloo-eval-40/QLOO_LIFT_EVAL.md`). Same-size tier AUC **0.664** [0.642, 0.687] is the pre-registered control-for-size test (`aggregates.json`, `sameSizeAuc`).

**Store verification honesty (PR #89 false-positive audit):** We removed all **4** known false positives across **13** test sites in that audit. We never claim "zero false positives": stores missing from **both** ATP and OSM cannot be detected, and OSM snapshot coverage applies to only **25** of **227** tracked chains on demo chips. Analyze also runs an **OSM `brand:wikidata` false-absence cross-check** (snapshot tiles plus demo Overpass recordings) so we do not label a top prospect as verified missing when wikidata says a store is in radius (`apps/worker/src/lib/osm-wikidata-absence-crosscheck.ts`, `data/qloo-eval-40/FALSE_ABSENCE_AUDIT.md`, `apps/worker/src/__tests__/false-absence-sweep.test.ts`).

**Shipped through deploy50 (integration head in `integration-head.txt`):**

- **Model review is checked against the panel rule** (#189, deploy50): live deploy49 runs showed gpt-4o-mini declining lifts the 10 point panel margin backs and writing reasons with wrong arithmetic (it called 19% below 24% minus 10 points). The server now checks every model call on an eligible lift against `comparableMarketsVerdict`; a call that breaks the rule is overruled and labeled **Panel check overruled the model**, and the reason shown is the server's sentence with both brands' numbers. Live lift and decline decisions therefore follow the shipped rule; the model still picks which backed lift goes first. That combined path was not replayed separately (`data/qloo-eval-40/REVIEW_JUDGMENT_BACKTEST.md`).
- **Evidence gated review** (#183): each eligible lift carries comparable market numbers for both brands (share of the 40 panel markets with a store, and taste twins with a store). The shipped rule lifts only when the lower brand's panel share is at least the displaced brand's minus 10 points. Leave one market out on the 40 panel: rule **+0.200** top 5 hits per market, 95% interval **[0.025, 0.375]**; recorded gpt-4o-mini replay **+0.175** [0, 0.35], 13 of 14 lifts that changed hits gained one. Read honestly, a gain of about 0.15 to 0.2 top 5 hits per market with a lower bound near zero.
- **Metered live analyze** (#184, #185): `/analyze/stream` counts its own subrequests and logs them. The meter found live analyze making every Qloo and OSM call inline (**57** counted on a preview run, near the **50** Free cap); after passing the loopback binding the same address measured **27** in the calling invocation. CI budget tests cover the inline and offload paths.
- **Live prospecting fits the Workers Free subrequest cap** (#176): a live run on a non-demo address made **69** subrequests in one Worker invocation (realistic stubbed count; the cap is **50**), so the gpt-4o-mini review and the outreach drafts fell back. Correction: **#174 alone did not fix this**. Its commit message says the review and drafts "no longer hit Too many subrequests", but the deploy43 production run still did, because #174 was measured on the demo planner path. What fixed it in #176: the 3 outreach drafts are **1** batched gpt-4o-mini call, the per-brand "Why" summaries are **1** batched call, co-tenancy lookups are memoized per isolate, and the per-brand audience lookups, co-tenancy lookups, and the review plus drafts run in separate invocations of the same Worker through the free `ctx.exports` loopback service binding. CI (`live-prospecting-model-path-budget.test.ts`) runs the real planner, review, and drafts paths on a non-demo address and requires every invocation to stay at or under **45**: run **33**, audience fan-out **25**, co-tenancy **7**, review and drafts **3**. Each job records its measured per-invocation counts in `agent_plan.detail.subrequests`. In production on deploy44, two live non-demo runs (240 Bedford Ave and 1000 Fulton St, Brooklyn) peaked at **31** subrequests in any one invocation, the gpt-4o-mini review ran with no fallback, and all 3 drafts per run were written by gpt-4o-mini ([audit](../RUBRIC_AUDIT_DEPLOY44.md)).
- **Taste-twin markets** (#173): for every pitch, the report's Why card shows how many of the **5** panel markets whose Qloo taste is closest to this site (over **50 km** away, from the **40**-address eval panel) already have the brand, and names them. At **3 of 5** or more it adds one reason line to the pitch. It reuses the insights the run already fetched (**no extra Qloo calls, no KV writes**). Backtest: twin share AUC **0.802** vs **0.724** for 5 random panel markets (difference 95% interval **0.060 to 0.098**) (`taste-twins.ts`, `data/qloo-eval-40/TASTE_TWIN_EVAL.md`). Since #180 twin share also feeds the pitch order on live addresses that are not demo chips (see **Taste-twin markets** under How we built it; `data/qloo-eval-40/TWIN_RANK_EVAL.md`). Demo chips keep the logistic blend.
- **Review after ranking** on full prospecting runs (#169, #172): after the standard ranking, a bounded reviewer may move a pitch with verified local audience overlap ahead of a top 5 pitch whose overlap was **checked and is zero** (at most **2** moves, no extra Qloo calls). Unknown overlap is never treated as evidence (`tradeAreaTasteChecked`). In production (live mode, demo chips included) the reviewer is **gpt-4o-mini** with `lift_pitch` and `decline_lift` tools, bounded turns and tokens, a server guardrail, and since #189 a server check of every call against the panel rule (above); demo mode and keyless servers use a rule reviewer, labelled **Rule** on the receipt, and model errors fall back to it. The receipt JSON and UI show **Top 5, standard ranking** (no planner, no review), **Top 5 before review**, **Top 5 after review**, the change vs the standard ranking, and the model calls and tokens used (`prospecting-agent-review.ts`, `AgentReceipt.tsx`). The first backtest on the three chips found 0 valid lifts on that data (`data/qloo-eval-40/REVIEW_LIFT_BACKTEST.md`); the 40 market judgment backtest above is the one that measures the review.
- **Bounded prospecting planner** before the fixed analyze pipeline on **Run full prospecting** (`agent_plan` on `prospecting-timeline`): up to **6** tool steps and **3** Qloo logical API calls per run, **18 s** loop timeout (`PROSPECTING_AGENT_MAX_STEPS`, `PROSPECTING_AGENT_MAX_QLOO_CALLS`, `prospecting-agent-planner.ts`). **Live** workers with `OPENAI_API_KEY` use **gpt-4o-mini** tool calling inside that step; **demo chips** use a deterministic rule planner (no OpenAI). If the planner is missing, times out, or errors, the run **falls back** to the same standard geocode → taste → store scan → verify → rank → outreach → pitch pack steps (`dag_fallback` summary on the job). Planner tool decisions are logged with planner kind **rule** vs **model**; the UI receipt labels those rows **Rule** or **Agent** when `agentSteps` are present (`AgentReceipt.tsx`, `agent-receipt.ts`).
- **Agent receipt** on completed prospecting jobs (`data-testid="agent-receipt"` on `/prospect/:id`): only steps the server actually logged (no invented rows), plain **Source** labels per step, optional **Why** line, JSON/Markdown download. Not a separate LLM narrative; it mirrors `ProspectingJob.steps` from the worker (`apps/web/src/lib/agent-receipt.ts`, `e2e` coverage in `apps/web/src/__tests__/agent-receipt.test.ts`).
- **13 verified brand real-estate URLs** in `brand-real-estate.json` (title/h1 content rule; parent-portal map for Gap Inc. brands only). Pitch rows link to official pages when verified, otherwise a Google search fallback (`BrandReachLine`, `scripts/check-brand-real-estate-urls.mjs`).
- **Nearest store reconciled across ATP and OSM:** `reconcileNearestStoreKm()` picks the closer distance; large ATP/OSM gaps mark distance as unconfirmed (`nearest-store-reconcile.ts`, `nearest-store-display-copy.ts`).
- **No false absences on the four demo pins (CI):** Wicker, Boulder, Sevierville, and 350 Bleecker Williamsburg fixture; `demo-chip-osm-absence-audit.test.ts` fails if OSM snapshot shows a store inside the absence radius but the report still claims absence (`docs/DEMO_NEAREST_OSM_AUDIT.md`).
- **Honest `Shared local audience` lines:** pitch copy only when the audience is in the brand's top **5** brand-only Qloo affinities and passes local overlap and lift gates (`BRAND_PITCH_CHARACTERISTIC_TOP_K`, `qloo-brand-taste-overlap.ts`, `broker-copy.ts`).
- **Address input validation:** typed addresses are rejected before geocode with plain errors for gibberish, PO boxes, non-US text, and ambiguous input (`address-input-validation.ts`, `analyze-robustness` e2e and screenshots under `docs/screenshots/analyze-robustness/`).
- **Chain-size fallback when Qloo is down:** live analyze returns national chain-size ranking with `tasteDataStatus: unavailable` and `TasteUnavailableBanner`; no fabricated taste scores (`qloo-chain-fallback.ts`, `qloo-analyze-resilience.test.ts`).

**Recording:** Atharv lifted the recording hold on Oct 26, 2026. Gallery stills were recaptured from deploy50 (`docs/devpost/GALLERY_ASSETS.md`, `scripts/capture-devpost-gallery-3x2.mjs`). The walkthrough video is being made separately; its URL goes in the Devpost video field (videos are optional for this hackathon). Copy ready to paste into every Devpost field is in `docs/devpost/SUBMISSION_PACK.md`.

---

## Devpost judging criteria (plain English)

### Technological Implementation

LeaseUp is a real split stack: a React site on Cloudflare Pages talks to a Hono worker that batches live Qloo `/v2/insights` brand calls (45 IDs per request, 227 tracked chains), merges them with a fitted logistic taste blend (default pitch order), and checks open store footprints from All The Places, OSM snapshot tiles, and the wikidata false-absence cross-check before a broker pitches. Dense trade areas apply a **3 km** absence-radius floor when filtering prospects (`prospectAbsenceRadiusKm`). If Qloo returns errors in live mode, analysis **falls back to chain-size ranking** with a visible banner (`TasteUnavailableBanner`, `qloo-chain-fallback.ts`). Pipeline cards persist **prospect status**, **notes**, **follow-up reminders**, and **evidence** (reasons + links back to the report and watchlist). We preregistered a **40-address** live API study, refreshed ATP/OSM ground truth after the OSM tile retile (PR #103), and committed the headline metrics in the repo. Raw Qloo order reached **P@10 0.5375** (54%) on that panel (`aggregates.json`); national chain size reached **0.760** (76%); our shipped blend reached **0.825** (83%, **+6.5** percentage points vs chain, 95% CI **3.3 to 9.3**). Among similar-size chains, Qloo separated present vs absent about two thirds of the time (**same-size tier AUC 0.664**, 95% CI **0.642 to 0.687**). We do not use Qloo heatmap to rank the pitch list.

### Design

Brokers see a **compact summary-first report**: three headline stat tiles with **honest rank copy** (raw Qloo **54%** vs chain **76%** vs blend **83%** nearby-match language tied to the active ranking mode), a plain **prospect funnel** sentence (scored / already nearby / pitched), then **Top brands to pitch** with brand-specific one-line reasons. The default list follows the **fitted taste blend**; under **How we know**, **Compare ranking** toggles **Local taste** vs **Chain size** so judges can see **83%** vs **76%** mean top-10 presence on the 40-address eval without implying raw Qloo beats chain size. The **Why this brand** card surfaces live Qloo taste overlap (recorded audiences on demo chips; live API in production) plus store-check honesty. **Co-tenancy mix** pairs OSM nearby tenants with Qloo pairing lines. A **non-blocking** first-run tour (`report-first-run-tour-hint`) keeps the report readable. Stable demo pitch at **`/pitch/demo-boulder-ulta`** (`e2e/demo-pitch-smoke.spec.ts`). **Vacancy cost** inputs are broker-controlled on the report, share dialog, and pitch snapshot; pitch pack and pipeline close the loop. **`/methodology/qloo`** explains Qloo in plain broker language.

### Potential Impact

Empty storefronts cost landlords carry every month; brokers waste outreach on chains that already operate nearby. LeaseUp shortens the path from address to a defensible shortlist: ranked brands, map context, reach lines when we have them, pipeline and owner-update links. The eval shows the biggest lift on mid-size chains landlords actually pitch (**P@5 0.53** vs **0.23** when ordering within the 439 to 864 store tier). Random guessing on the same panel only hits **P@10 0.29**.

### Quality of Idea

The idea is to treat Qloo as **local taste beyond chain size**, not a replacement for footprint data. Raw Qloo order is weaker than chain size on mean P@10 (**54%** vs **76%**); the product story is the **blend** (**83%** vs **76%**; exact **0.825** vs **0.760**) and **within-tier** ordering (mid-size **P@5 0.53** vs **0.23**). P@10 still means share of top 10 already in the trade area per ATP/OSM, not leases or guaranteed whitespace.

---

## Judge path (try the product + where to verify)

The live site runs in live mode (top bar: **Live data**). The three demo chips below replay recorded Qloo and store data (badge: **Recorded demo**), so they are fast and never use quota. Any other US address runs live Qloo calls under the daily cap described below.

### Try it in 60 seconds

Three stops judges care about: **finished report**, **shareable pitch**, **pipeline board**. Minimal click path from the landing page:

| Stop | Clicks from `/` | What you should see |
| --- | --- | --- |
| **1. Report** | **1** (click demo chip **Wicker Park, Chicago**) | Compact summary (`report-summary`): stat tiles, plain funnel (`report-prospect-funnel`, 3 km absence radius on dense Wicker), **Top brands to pitch** (`brands-to-pitch`). Dismiss or take the optional **Quick tour** (`report-first-run-tour-hint`; non-blocking). Open **How we know**, **Compare ranking** (`qloo-ranking-toggle`): **Local taste** vs **Chain size** (83% vs 76% mean top-10 presence; `e2e/qloo-ranking-toggle.spec.ts`). **Why this brand** (`why-this-brand`); full list in **Why these brands** (`brands-to-pitch-full-list`). |
| **1b. Run full prospecting** | **1** (paste a demo chip address, click **Run full prospecting**, `landing-run-prospecting`) **or +1** from a finished report (**Run full prospecting** in the sticky header, `run-full-prospecting`) | Timeline (`prospecting-page`, `prospecting-timeline`) includes **Plan site checks (agent)** then the standard steps through **Assemble pitch pack** and **Open pitch pack** (`e2e/features.spec.ts`, `e2e/broker-journey.spec.ts`; allow up to ~4 minutes on demo fixtures). When the run finishes, expand **Agent receipt** for logged steps; planner tool lines show **Rule** or **Agent** when the server logged `agentSteps`. |
| **2. Pitch pack** | **+1** open stable demo **`/pitch/demo-boulder-ulta`** (`pitch-page`, `e2e/demo-pitch-smoke.spec.ts`) **or +2** from report (**Share pitch pack** → **Create public link**) | Read-only pitch with leasing brief and vacancy block |
| **3. Pipeline + watchlist loop** | **+2** on report (**Add to pipeline** on a top brand and/or **Watch this space**, then **Pipeline** or **Watchlist** in the header) | Kanban with saved evidence (`pipeline-evidence`); open a card and follow **Site report** / **Watched space** back to the same pitch (`e2e/pipeline-loop.spec.ts`) |

**Exact demo addresses** (recorded Qloo + store fixtures; keep in sync with `packages/fixtures/src/demo-addresses.ts`):

| Chip label | Address |
| --- | --- |
| Wicker Park, Chicago | `1560 N Milwaukee Ave, Chicago, IL 60622` |
| Pearl Street, Boulder | `1300 Pearl St, Boulder, CO 80302` |
| Sevierville, TN | `125 Collier Dr, Sevierville, TN 37862` |

Manual entry path (two clicks to report): paste a chip address, click **Analyze**. Legacy aliases such as `1574 N Milwaukee Ave, Chicago, IL 60622` still route to the Wicker fixture.

### Live Qloo judge path (hackathon API, server-side key only)

Production at https://leaseup-59m.pages.dev runs the worker with **`APP_MODE=live`** and **`QLOO_API_KEY`** as a **Cloudflare Worker secret** (never in the browser, never in Pages env). Confirm with `GET https://leaseup-worker.issue-atharva.workers.dev/api/health`: `mode` is `live` and `providers.qloo` is `configured`. The three demo chips still replay recordings.

**Example address (40-address eval panel, not a landing chip):** `240 Bedford Ave, Brooklyn, NY 11249` (`packages/fixtures/src/eval/live-qloo-lift/site-table.json`, Williamsburg row). Paste on the landing field, click **Analyze** (not a demo chip). Expect **Live data** in the top bar, slower analyze (often **30 to 90 seconds** on cold cache) while the worker batches brand insights, then the same report surfaces as the chips. **Run full prospecting** on the same address shows the gpt-4o-mini planner, the review callout and the Agent receipt (a deploy50 run took about 30 seconds).

**Quota guard:** Live analyzes increment a **UTC daily cap** in D1 `rate_limits` (`apps/worker/src/lib/live-qloo-judge-quota.ts`) so judges cannot exhaust the shared key. Configure **`LIVE_QLOO_JUDGE_DAILY_CAP`** on the worker (default **48** cold live analyzes per UTC day). Over limit returns **429** with code **`LIVE_QLOO_JUDGE_QUOTA_EXCEEDED`**; use a demo chip or retry after the UTC day rolls over (8 PM Eastern through Oct 31, 7 PM Eastern from Nov 1). Repeat runs of an address already cached do not count as cold.

**Local reviewer stack:** Copy `apps/worker/.dev.vars.example` to `.dev.vars`, set `APP_MODE=live` and `QLOO_API_KEY`, run `pnpm dev`, open the Vite URL, and use the Bedford address above (`README.md`).

**Stills:** the deploy50 gallery is in `docs/devpost/gallery/` (files `01-` to `12-`, listed in `GALLERY_ASSETS.md`). Older stills stay in `docs/screenshots/` for the audit history.

**In-app Qloo explainer (brokers):** [How LeaseUp uses Qloo](/methodology/qloo) from the methodology page (`apps/web/src/pages/HowLeaseUpUsesQlooPage.tsx`).

### Feature map to official criteria

Eval numbers below are only from `data/qloo-eval-40/QLOO_LIFT_EVAL.md` and `packages/fixtures/src/eval/` (40-address panel, Oct 2026). **TI** = Technological Implementation, **Des** = Design, **Imp** = Potential Impact, **Idea** = Quality of Idea.

| Feature | TI | Des | Imp | Idea | Proof in repo |
| --- | --- | --- | --- | --- | --- |
| Landing + demo chips (3 addresses) | | ✓ | ✓ | | `apps/web/src/data/landing-demo-chips.ts`, `apps/web/src/pages/LandingPage.tsx` |
| Hero product preview (static Wicker still) | | ✓ | ✓ | | `apps/web/src/components/landing/LandingHeroProductPreview.tsx` |
| Qloo `/v2/insights` brand batching (45 IDs, 227 chains) | ✓ | | | ✓ | `apps/worker/src/providers/qloo.ts`, `apps/worker/src/services/analysis.ts` |
| Logistic taste blend ranking (default pitch order) | ✓ | | | ✓ | `packages/fixtures/src/eval/live-qloo-lift/logistic-coefficients.json`, `apps/worker/src/lib/analysis-enrichment.ts`, `apps/web/src/lib/ranking-production.ts` |
| **Compare ranking** toggle (Local taste vs Chain size, 83% vs 76% eval) | ✓ | ✓ | | ✓ | `apps/web/src/components/report/QlooRankingToggle.tsx`, `e2e/qloo-ranking-toggle.spec.ts` |
| Adaptive **3 km** absence radius + prospect funnel copy | ✓ | ✓ | ✓ | ✓ | `packages/fixtures/src/eval-density-stratum.ts`, `ReportProspectFunnel.tsx`, `apps/worker/src/lib/prospect-funnel.ts` (#101) |
| Non-blocking report first-run tour | | ✓ | ✓ | | `ReportFirstRunTour.tsx` (`report-first-run-tour-hint`) (#104) |
| Stable demo pitch `/pitch/demo-boulder-ulta` | ✓ | ✓ | ✓ | | `packages/fixtures/src/demo-pitch-boulder-ulta.ts`, `e2e/demo-pitch-smoke.spec.ts` (#102) |
| Qloo-down chain-size fallback | ✓ | ✓ | ✓ | | `apps/worker/src/lib/qloo-chain-fallback.ts`, `apps/worker/src/__tests__/qloo-analyze-resilience.test.ts`, `apps/web/src/components/report/TasteUnavailableBanner.tsx`, `docs/screenshots/analyze-robustness/qloo-timeout-1440.png` |
| Nearest store ATP + OSM reconcile | ✓ | ✓ | ✓ | | `apps/worker/src/lib/nearest-store-reconcile.ts`, `apps/worker/src/__tests__/nearest-store-reconcile.test.ts` |
| Demo-pin OSM absence audit (4 addresses) | ✓ | ✓ | | | `apps/worker/src/__tests__/demo-chip-osm-absence-audit.test.ts`, `docs/DEMO_NEAREST_OSM_AUDIT.md` |
| Shared local audience (brand top-5 affinity gate) | | ✓ | ✓ | | `packages/fixtures/src/qloo-brand-taste-overlap.ts`, `docs/screenshots/co-tenancy-fallback/` |
| Address input validation + calm errors | ✓ | ✓ | | | `apps/worker/src/lib/address-input-validation.ts`, `e2e/analyze-robustness.spec.ts`, `docs/screenshots/analyze-robustness/` |
| Brand-specific pitch reasons (per prospect) | ✓ | ✓ | ✓ | ✓ | `apps/worker/src/services/analysis.ts`, `apps/web/src/lib/prospect-one-line.ts`, `apps/worker/src/__tests__/prospect-reasons.test.ts` |
| Above-fold **Top brands to pitch** (`brands-to-pitch`) | | ✓ | ✓ | | `apps/web/src/components/report/ReportSummaryAboveFold.tsx`, `e2e/report-brands-visible.spec.ts` (390 + 1440; #93) |
| **Why this brand** card (live Qloo taste overlap + honest rank line) | ✓ | ✓ | ✓ | ✓ | `WhyThisBrandCard.tsx`, `why-brand-taste-ui.ts`, `packages/fixtures/src/brand-explainability/` |
| **Co-tenancy mix** (OSM tenants + Qloo pairing bars) | ✓ | ✓ | ✓ | | `CoTenancyMixSection.tsx`, `co-tenancy-mix.ts`, `apps/web/src/__tests__/co-tenancy-mix.test.ts` |
| Compact report summary (stat tiles + dense top-five list) | | ✓ | ✓ | | `apps/web/src/components/report/ReportSummaryAboveFold.tsx`, `docs/screenshots/report-summary-design/` (#96) |
| Report → pipeline → watchlist loop | ✓ | | ✓ | | `e2e/pipeline-loop.spec.ts`, `apps/worker/migrations/0005_pipeline_card_evidence_watch.sql` |
| Pipeline statuses, notes, reminders | ✓ | ✓ | ✓ | | `apps/web/src/lib/pipeline-status.ts`, `apps/web/src/components/pipeline/PipelineCardDialog.tsx` |
| Plain-language broker copy pass | | ✓ | ✓ | | `apps/web/src/lib/broker-visible-jargon.ts`, `e2e/broker-jargon.spec.ts` |
| How LeaseUp uses Qloo (`/methodology/qloo`) | ✓ | ✓ | | ✓ | `apps/web/src/pages/HowLeaseUpUsesQlooPage.tsx`, `apps/web/src/lib/qloo-broker-explainer-copy.ts` |
| Mobile Lighthouse (GitHub Actions LHCI) | ✓ | ✓ | | | Actions run **40074283024**: median of 3 mobile runs (landing perf **93**, report perf **89**, report a11y **96**; `LHCI_MEDIANS` in CI logs) |
| Trade area shopper tags (location insights) | ✓ | ✓ | ✓ | | `apps/worker/src/lib/trade-area-shoppers.ts`, `apps/web/src/components/report/WhoShopsHereCard.tsx` |
| Store presence checks (ATP + OSM + wikidata false-absence cross-check) | ✓ | ✓ | ✓ | | `apps/worker/src/lib/osm-wikidata-absence-crosscheck.ts`, `apps/worker/src/lib/false-absence-sweep.ts`, `data/qloo-eval-40/FALSE_ABSENCE_AUDIT.md`; PR #89 false-positive audit: removed 4 known false positives across 13 sites (not zero FP; OSM covers 25/227 chains) |
| Summary-first report + collapsible depth | | ✓ | ✓ | | `apps/web/src/components/report/ReportSummaryAboveFold.tsx`, `ReportDeepSections.tsx` |
| Qloo proof strip + strict eval card | ✓ | ✓ | | ✓ | `apps/web/src/lib/qloo-proof.ts`, `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` |
| Vacancy cost (report, share, pitch) | | ✓ | ✓ | | `apps/web/src/components/report/VacancyCostCalculator.tsx`, `apps/web/src/pages/PitchPage.tsx` |
| Pitch pack share link | ✓ | ✓ | ✓ | | `apps/web/src/components/report/SharePitchDialog.tsx`, `apps/worker/src/services/pipeline.ts` (pitch API) |
| Pipeline kanban + D1 cards | ✓ | | ✓ | | `apps/web/src/pages/PipelinePage.tsx`, `apps/worker/src/lib/pipeline-cards-db.ts` |
| Owner update share from pipeline | ✓ | ✓ | ✓ | | `apps/web/src/components/pipeline/OwnerUpdatePanel.tsx`, `apps/worker/src/lib/owner-update.ts` |
| Brand reach lines (**13** verified official URLs, title/h1 rule) | | ✓ | ✓ | | `BrandReachLine.tsx`, `brand-real-estate.json`, `scripts/check-brand-real-estate-urls.mjs` (content-verified **2026-10-24**) |
| Portfolio batch (up to 10 sites) | ✓ | | ✓ | | `apps/web/src/pages/PortfolioPage.tsx` |
| Brand sites / heatmap explore (not used to rank pitch list) | ✓ | ✓ | | ✓ | `apps/web/src/pages/BrandPage.tsx`; heatmap lift: `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` (`heatmapAddsLift: false`) |
| Watchlist + diff | ✓ | ✓ | ✓ | | `apps/web/src/pages/WatchlistPage.tsx`, `packages/fixtures/src/watch-diff.ts` |
| **Run full prospecting** + bounded planner (`agent_plan`) | ✓ | ✓ | ✓ | ✓ | `apps/worker/src/lib/prospecting-agent-planner.ts`, `apps/worker/src/services/prospecting.ts`, `ProspectingPage.tsx` |
| **Agent receipt** (logged steps, JSON/Markdown) | ✓ | ✓ | | ✓ | `apps/web/src/components/prospecting/AgentReceipt.tsx`, `apps/web/src/lib/agent-receipt.ts` |
| Methodology + 40-address tables | ✓ | ✓ | | ✓ | `apps/web/src/pages/MethodologyPage.tsx`, `packages/fixtures/src/eval/results_adaptive.json` |
| Preregistered 40-address live Qloo eval | ✓ | | | ✓ | `data/qloo-eval-40/QLOO_LIFT_EVAL.md`, `packages/fixtures/src/eval/live-qloo-lift/QLOO_LIFT_EVAL.md` |

**Eval-backed claims tied to features above (same sources only):**

| Claim | Value | Where committed |
| --- | --- | --- |
| Raw Qloo mean P@10 (adaptive radius) | 0.5375 (report as 54%) | `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` (`rawQlooPrecisionAt10`); `data/qloo-eval-40/QLOO_LIFT_EVAL.md` rounds to 0.538 in prose tables |
| Chain size mean P@10 | 0.760 (report as 76%) | same |
| Logistic blend mean P@10 vs chain | 0.825 vs 0.760 (83% vs 76%; +6.5 pp, 95% CI 3.3 to 9.3) | same |
| Same-size tier AUC | 0.664 [0.642, 0.687] | same |
| Random P@10 | 0.29 | `data/qloo-eval-40/QLOO_LIFT_EVAL.md` (T1 adaptive) |
| Mid-size tier P@5 (439 to 864 stores), Qloo vs chain | 0.53 vs 0.23 | `data/qloo-eval-40/QLOO_LIFT_EVAL.md` (T4), `packages/fixtures/src/eval/tables.md` |
| Wicker adaptive row (blend vs chain P@10 at 1.5 km) | 0.9 vs 0.7 | `data/qloo-eval-40/QLOO_LIFT_EVAL.md` (demo addresses), `packages/fixtures/src/demo-adaptive-proof.ts` |
| 40-address eval panel size | 40 sites | `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` (`siteCount`) |
| Qloo brand batch size / tracked chains | 45 IDs per request, 227 chains | `apps/worker/src/providers/qloo-location.ts` (`QLOO_MAX_BRANDS_PER_REQUEST`), `apps/worker/src/data/tracked-brand-ids.ts` (`TRACKED_BRAND_COUNT`) |
| Adaptive absence radius floor (dense trade areas) | 3 km | `packages/fixtures/src/eval-density-stratum.ts`, `data/qloo-eval-40/ADAPTIVE_RADIUS_TRADE_AREA_AUDIT.md` |
| False-positive audit removals | 4 across 13 sites | `data/qloo-eval-40/FALSE_POSITIVE_AUDIT.md`, `apps/worker/src/__tests__/false-positive-prospect-audit.test.ts` |
| OSM snapshot chain coverage on demo chips | 25 of 227 | `packages/fixtures/src/eval/cohort-eval-display.ts` |
| Mobile Lighthouse medians (3 runs) | landing perf 93; report perf 89; report a11y 96 | `docs/qa/a11y-perf.md` (Actions run **40074283024**, `LHCI_MEDIANS`) |
| Verified brand real-estate URLs | 13 | `packages/fixtures/src/brand-real-estate.json` (`status: verified`, checked by `scripts/check-brand-real-estate-urls.mjs`) |
| Production integration head (short SHA) | `docs/devpost/integration-head.txt` | Must be a commit on `cursor/leaseup-v1-c429`; checked by `scripts/check-submission-doc.mjs` |

---

## Inspiration

Brokers and landlords lose time pitching chains that already operate inside the trade area. National chain size is a strong guess for who is "already here," but it does not tell you which mid-size brands fit a specific block. We built LeaseUp to combine Qloo Taste AI with open store footprints so a broker can walk into a landlord meeting with a ranked list, a map, and numbers that survive scrutiny.

---

## What it does

LeaseUp turns a storefront address into a broker-ready pitch workflow. Shipped on production from integration branch **`cursor/leaseup-v1-c429`** (head in `docs/devpost/integration-head.txt`):

### Landing redesign

- Split hero: copy and address form on the left, **`LandingHeroProductPreview`** on the right (`data-testid="landing-hero-product-preview"`).
- Static Wicker Park report screenshot (AVIF/WebP in `apps/web/public/landing/`), not autoplay video. Links to the live Wicker demo report.
- Trade area (2, 5, or 10 km) and category filters on the same form; demo chips for Wicker, Boulder, and Sevierville.
- Below the fold: three step cards, proof copy from `landing-eval-copy`, feature tiles (pitch pack, pipeline, vacancy cost, portfolio), and footer (`LandingBelowFold`, `LandingPageFooter`).

### Summary-first report

- **`ReportSummaryAboveFold`** (`data-testid="report-summary"`): compact **`HeadlineCard`** with three stat tiles (including **Nearby match** tied to the active ranking mode), **`ReportProspectFunnel`** (`report-prospect-funnel`) with the plain scored / already nearby / pitched sentence at the adaptive absence radius (3 km floor in dense areas), then **Top brands to pitch** (`data-testid="brands-to-pitch"`, dense top-five rows with **brand-specific one-line reasons** from `prospectOneLineReason`). Default pitch order uses the **fitted logistic taste blend** (`ranking-production.ts`, `orderProspectsForRankingMode`). Per-row **Add to pipeline** (compact ghost control on desktop hover) plus **Share pitch pack** and report-level **Add to pipeline** CTAs.
- **`ReportFirstRunTour`**: optional bottom hint (`report-first-run-tour-hint`); dismiss or **Take the tour** without blocking the report (`ReportFirstRunTour.tsx`).
- **`WatchSpaceButton`** (`watch-this-space`) saves the address to **Watchlist** for later diff alerts.
- Deeper sections collapse under **Why these brands**, **What it costs you**, and **How we know** (`ReportCollapsibleSection`). **How we know** hosts **`QlooRankingToggle`** (`qloo-ranking-toggle`): **Local taste** (blend, **83%** mean top-10 presence on the 40-address eval) vs **Chain size** (**76%**), reordering the proof table and summary stat (`e2e/qloo-ranking-toggle.spec.ts`).
- Map column: ranked map, **`WhyThisBrandCard`** (`data-testid="why-this-brand"`) for the selection with **Qloo taste overlap** lines from live or recorded brand audiences (`whyBrandTaste`, `formatBrandTasteOverlapLine`), an honest **rank summary** line, store-check copy, and optional **BrandReachLink**. Sidebar facts and **Trade area shoppers** when data is available. Full ranked list stays in collapsible **Why these brands** (`brands-to-pitch-full-list`).
- **`CoTenancyMixSection`** (`data-testid="co-tenancy-mix"`): nearby OSM retail tenants plus category bars comparing who is already open vs who you are pitching (`buildCoTenancyMix`, `co-tenancy-copy.ts`).

### Trade area shoppers (Qloo tags)

- **`WhoShopsHereCard`** (`data-testid="who-shops-here"`), titled **Trade area shoppers** in the UI.
- Ordered tag names from Qloo **location** insights (not brand affinity scores; tooltip explains scores cluster near 1).
- Live: `getTradeAreaShopperTagInsights` on the worker (`apps/worker/src/lib/trade-area-shoppers.ts`). Demo: recorded fixtures under `packages/fixtures/src/trade-area-shoppers/`.

### Who to contact (brand reach)

- **`BrandReachLine`** (`data-testid="brand-reach-line"`) on the pitch list (`BrandsToPitch`) and on each brand block in **`PitchPackBrief`**.
- When `brand-real-estate.json` marks a row **verified**, the link passed CI on **2026-10-24**: official brand or parent domain, HTTP **2xx**, and the page `<title>` or `<h1>` contains **real estate**, **site selection**, **leasing**, or **property** (see `scripts/brand-real-estate-page-verify.mjs`). Parent portals (e.g. Gap Inc.) are only allowed for explicitly mapped brands (`scripts/brand-real-estate-parent-map.mjs`). Examples that pass today: **Old Navy**, **Athleta**, **Foot Locker**, **Sprouts**, **Wendy's**, **Whole Foods Market**. Bot-blocked or soft-404 pages fall back to **Search for their real estate contact** (`brand-reach-copy.ts`). CI skips transient network failures (status **0**) without failing the build.
- Pitch pack also has a dashed **contact slot** when no reach record exists yet.

### Vacancy cost

- Report section **What it costs you** (`report-section-vacancy-costs`): **`VacancyCostCalculator`** plus storefront size control. Inputs persist per address in local storage.
- **Share pitch pack** dialog and frozen **pitch page** include the same vacancy block; snapshot can store values on the link.

### Pitch pack

- **`PitchPackBrief`** (`data-testid="pitch-pack-brief"`): leasing brief per brand, fit lines, store verification labels, optional map on the first brand, trade area facts, reach line, and print-friendly layout on **`PitchPage`** (`data-testid="pitch-page"`).
- Stable judge demo (no share dialog): **`/pitch/demo-boulder-ulta`** (Boulder Ulta fixture, `demo-pitch-boulder-ulta`; smoke in `e2e/demo-pitch-smoke.spec.ts`).

### Owner update

- **`OwnerUpdatePanel`** on **`PipelinePage`** (`data-testid="owner-update-panel"`): pick a property from pipeline cards, preview contacted brands and stages, share a read-only link at `/owner-update/:id` (`OwnerUpdatePage`, `data-testid="owner-update-page"`).

### Pipeline CRM (statuses, notes, reminders)

- Kanban stages use broker labels: **To pitch**, **Drafted**, **Sent by me**, **Replied**, **Touring**, **LOI**, **Passed** (`apps/web/src/lib/pipeline-status.ts`).
- **`PipelineCardDialog`**: free-text **notes**, optional **next step reminder** (`followUpAt`), outreach draft, and **evidence snapshot** (saved pitch reasons + links to the site report and watched space).
- Keyboard and axe coverage: `e2e/pipeline-keyboard-a11y.spec.ts`, `e2e/pipeline-crm.spec.ts`.

### Report → pipeline → watchlist loop

1. Run a demo-chip report (fitted-blend ranking by default).
2. **Add to pipeline** from a top-five row or primary CTA; optionally **Watch this space** for diff alerts.
3. Open **Pipeline** or **Watchlist** from the header; open a card, read **evidence**, and use **Site report** / **Watched space** to return to the same address (`e2e/pipeline-loop.spec.ts`).

### Qloo-down fallback (live)

- When taste insights cannot be fetched, the worker still returns a ranked list by **national chain size**, sets `tasteDataStatus: unavailable`, and the report shows **`TasteUnavailableBanner`** with plain copy (`e2e/qloo-down.spec.ts`). Demo chips are unaffected (recorded taste JSON).

### Plain-language UX + methodology

- Broker-visible surfaces avoid raw metric jargon; proof and methodology pages define terms inline (`apps/web/src/lib/eval-display.ts`, `StrictEvalCard`, `ProofSection`).
- **`/methodology/qloo`**: short **How LeaseUp uses Qloo** page linked from the methodology hub (no internal "do not say" editor language).

### Full prospecting run (planner + receipt)

- **`ProspectingPage`** (`data-testid="prospecting-page"`): after geocode, the worker runs **Plan site checks (agent)** then the same analyze steps as a one-click report, optional outreach drafts, and a pitch pack link.
- **Planner (honest scope):** Not a free-form chat agent. A **bounded** tool loop (max **6** steps, max **3** Qloo calls, **18 s** timeout) may prefetch taste, store checks, or stratum hints that feed the fixed DAG (`analyzeWithSteps` with optional `agentDagHooks`). **Demo chips** use a scripted **rule** planner; **live** mode uses **gpt-4o-mini** only when `OPENAI_API_KEY` is set on the worker. Otherwise the UI shows a **fixed analysis pipeline** fallback and the run still completes.
- **Agent receipt:** After `status: complete`, the page shows **Agent receipt** with one card per logged step, **Source** line (for example "Neighborhood taste data"), result summary, and nested **Rule** / **Agent** lines for planner tools when present. Downloads export the same fields as JSON or Markdown. The receipt does not claim lease outcomes or fabricate API calls.

### Still in the flow

- Geocode confirm when needed; ranked list uses the fitted logistic taste blend when Qloo is available; store checks via All The Places (227 tracked chains), OSM snapshot tiles, wikidata false-absence cross-check, and adaptive absence radius (3 km floor in dense areas) on demo chips; Qloo proof under **How we know** cites **54% / 76% / 83%** mean top-10 presence (raw Qloo / chain / blend; exact **0.5375 / 0.760 / 0.825**) per `packages/fixtures/src/eval/live-qloo-lift/aggregates.json`; optional **OutreachSheet** draft (broker clicks, never auto-sent).

Demo chips use recorded Qloo JSON so judge demos stay fast.

---

## How we built it

### Stack

- **Web:** React, Vite, MapLibre GL, TanStack Query on Cloudflare Pages.
- **API:** Cloudflare Worker (Hono), response cache for successful upstream calls, D1 for portfolio, pipeline, and metrics.
- **Quality:** Playwright e2e (broker jargon, pipeline loop, Qloo-down, CRM, `report-brands-visible`, `qloo-ranking-toggle`, `demo-pitch-smoke`), Lighthouse CI (GitHub Actions LHCI median of 3 mobile runs, run **40074283024**: landing perf **93**, report perf **89**, report a11y **96**; `docs/qa/a11y-perf.md`), CSP regression, worker bundle guard, Vitest on copy, ranking mode, prospect funnel, adaptive absence radius, and false-absence sweep.

### Exactly how Qloo is used

**Brand ranking (live reports):**

1. After geocoding, WKT `POINT(lon lat)` plus `signal.location.radius` in meters (2, 5, or 10 km).
2. **`GET /v2/insights`** per brand batch: `filter.type=urn:entity:brand`, up to **45** entity IDs per request, **227** tracked chains, `take` capped at **50**, `feature.explainability=true` where supported.
3. Insights merged and re-ranked with **`orderInsightsByLogisticBlend`** (coefficients in `packages/fixtures/src/eval/live-qloo-lift/logistic-coefficients.json`), or with the taste twin blend on live non-demo addresses (below).
4. Heatmap is not used to order the pitch list (offline eval showed no ranking lift vs insights alone).

**Trade area shoppers (tags):**

1. Separate Qloo **location-level tag** insights via **`getTradeAreaShopperTagInsights`** (cached; demo fixtures on the three chips).
2. UI shows ordered tag **names** in groups; raw affinities are not shown on the card.

**Taste-twin markets (no extra calls):**

1. The brand insights from step 2 above become a site taste vector (per-site z-score minus each brand's panel mean).
2. Pearson similarity against the **40** recorded panel markets (static `taste-twin-panel.json`, built from `data/qloo-eval-40` by `scripts/eval/build-taste-twin-panel.py`), skipping any within **50 km**; the closest **5** are the twins.
3. Each pitch gets `tasteTwins` (present in N of 5, which markets).
4. On live addresses that are not one of the three demo chips, the pitch order uses a twin blend (`orderInsightsByTwinBlend` in `apps/worker/src/lib/twin-rank.ts`): chain size, Qloo affinity and the share of twins where the brand trades. Leave one site out on the 40 panel, top 10 hits rose from 8.2 to 9.0 of 10 (all brands) and from 6.4 to 7.3 (top 50 pool); details in `data/qloo-eval-40/TWIN_RANK_EVAL.md`. The run says which model it used (`rankingModel`). Demo chips keep the logistic blend.

**Demo mode:** recorded brand insights and shopper tag fixtures for Wicker, Boulder, and Sevierville.

**Evaluation honesty (broker read, then exact):** Across 40 US addresses, ranking by raw Qloo affinity put about **5** brands in the top 10 that already had a store in the trade area on average (**P@10 0.5375**, **54%** from `aggregates.json`). Sorting by national chain size put about **8** of those top 10 slots on brands already there (**P@10 0.760**, **76%**). The legacy 0.75/0.25 blend averaged about **6** (**P@10 0.59**). The fitted logistic taste blend reached **82.5%** mean top-10 presence (**83%** rounded), better than size alone (**P@10 0.825**, **+6.5** percentage points vs chain, 95% CI **3.3 to 9.3** pp from `aggregates.json`). Among brands of similar chain size, Qloo's score separated present vs not present about two thirds of the time (**same-size tier AUC 0.664**, 95% CI **0.642 to 0.687**). Ground truth and aggregates were refreshed Oct 24, 2026 after the OSM snapshot retile (PR #103); Qloo insight JSON is unchanged.

---

## Challenges

1. **Telling the truth about Qloo:** raw affinity puts fewer "already here" brands in the top 10 than chain size alone (about 5 vs about 8 of 10 slots on average; **P@10 0.54 vs 0.76**). We rebuilt ranking around the logistic blend and show chain-size baselines beside taste rankings.
2. **Dense trade areas:** a fixed 10 km presence check saturates in eval and over-filters pitches in product. We use density-adaptive eval radii and a **3 km** absence floor when pitching in dense areas, with the funnel sentence on the report.
3. **Broker-readable UI:** summary-first report, plain headline copy, shopper tags without misleading affinity decimals, and reach lines that admit when contact data is missing.
4. **Split hosting and KV budget:** Pages vs Worker API, pipeline cookies, local-only media capture, and cached Qloo responses.

---

## Accomplishments

- Production on integration branch **`cursor/leaseup-v1-c429`** (deploy50): compact summary with prospect funnel, search vs absence radius explainer, default **fitted taste blend** with **Compare ranking** toggle (**83%** vs **76%** on the 40-address eval), non-blocking tour, stable **`/pitch/demo-boulder-ulta`**, OSM wikidata false-absence cross-check, **`brands-to-pitch`**, pipeline evidence loop, watchlist hardening (#107), **13** verified reach URLs, ATP/OSM nearest-store reconcile, demo-pin absence CI audit, gated **Shared local audience** copy, address validation, **Qloo-down fallback**, bounded **prospecting planner** + **Agent receipt** on full runs (#155, #156), **review after ranking** with before and after top 5 on the receipt (#169, #170, #172), **taste-twin markets** on every pitch (#173), static tile memo and planner brand-name resolution for the Workers Free subrequest budget (#174, #176), twin ranking on live addresses (#180), the evidence gated review (#183) checked against the panel rule (#189), and a metered live analyze path (#184, #185).
- Trade area shopper tags; brand reach lines; vacancy cost on report, share dialog, and pitch snapshot; owner update share links.
- Plain-language broker pass + **`/methodology/qloo`** explainer; methodology shows exact cohort percents (82.5% vs 76%, +6.5 pp); mobile Lighthouse landing perf **93** / report perf **89** / report a11y **96** (GitHub Actions LHCI medians, run **40074283024**).
- Preregistered **40-address** live Qloo evaluation (refreshed Oct 24, 2026): mean top-10 presence **54% / 76% / 83%** (raw Qloo / chain / blend; exact **0.5375 / 0.760 / 0.825** in `aggregates.json`) per ATP/OSM; same-size tier AUC **0.664**; mid-size tier **P@5 0.53 vs 0.23**.

---

## What we learned

- Qloo affinity is compressed and partly reflects brands that already operate nearby; **taste fit within a chain-size tier** is the honest broker story.
- Location tag insights help describe **who shops here** without pretending affinity decimals are precise on screen.
- Landlords trust store checks, vacancy math they control, and shareable owner updates tied to real pipeline cards.

---

## What's next

- Expand live-address coverage and refresh logistic coefficients on a schedule.
- More verified brand real-estate URLs in `brand-real-estate.json` for reach lines.

---

## Three-minute demo video script (180 seconds)

**Format:** 1440x900, visible cursor overlay, no browser chrome. This is the original script; the current video is produced separately and may differ.

**Narration:** plain and confident. Backtest lines use the eval definition: each ranker's **top 10** checked against open store footprints in the trade area.

### Shot list (timed)

| Time | Shot | Action / narration |
| --- | --- | --- |
| 0:00-0:10 | Landing hero | Light mode. Read headline and subhead (tagline above). Point at **hero product preview** image: "Recorded Wicker demo beside the form." |
| 0:10-0:18 | Address | Type `1560 N Milwaukee Ave, Chicago, IL 60622`. Click **Analyze**. |
| 0:18-0:30 | Report summary | Hold on `report-summary`, `report-prospect-funnel`, and `brands-to-pitch`. Dismiss tour hint if shown. "Summary first, then detail on demand." |
| 0:30-0:40 | Trade area shoppers | Scroll map column to **Trade area shoppers** (`who-shops-here`). "Qloo location tags describe who shops here, as ordered names, not fake-precise scores." |
| 0:40-0:50 | Who to contact | In **Why these brands**, expand a row with **How to reach them** (`brand-reach-line`) or show the dashed slot. "Official real-estate link when we have it." |
| 0:50-1:00 | Vacancy cost | Open **What it costs you**. Adjust vacancy calculator briefly. "Landlords see carrying cost in their own inputs." |
| 1:00-1:12 | Qloo proof | Open **How we know**. Toggle **Chain size**, then back to **Local taste** (`qloo-ranking-toggle`). "Default blend 82.5% mean top-10 presence vs 76% chain size on 40 addresses (+6.5 pp); raw Qloo is lower at 54%. We do not claim raw Qloo beats chain size." |
| 1:12-1:22 | Share pitch pack | Click **Share pitch pack**, **Create public link**, or open **`/pitch/demo-boulder-ulta`**. Show link or stable demo URL. |
| 1:22-1:38 | Pitch pack | Hold on **Leasing brief** and first brand: map, fit bullets, **How to reach them**, vacancy section on page. |
| 1:38-1:46 | Pipeline add | Back to report; **Add to pipeline**; hold **Added to pipeline**. |
| 1:46-2:04 | Pipeline and owner update | `/pipeline`: card on board. Scroll to **Owner update**; preview and copy share link. "One page for the landlord from real pipeline cards." |
| 2:04-2:14 | Map | Pan map; click a second brand. Brief hold. |
| 2:14-2:24 | Methodology | `/methodology` proof section. "Full methodology and CIs on the site." |
| 2:24-3:00 | Outro | Return to landing; headline on screen. "Find the right stores for your empty retail space. Open the Wicker demo." (Pad with still frame if narration ends early; do not exceed 3:00.) |

**Total:** 3:00 (180 s).

### Do not say on camera

- That raw Qloo beats chain size on the top-10 "already here" check (about 5 vs about 8 of 10; **P@10 0.54 vs 0.76**).
- That P@10 means signed leases or that every top pick is guaranteed whitespace.
- That shopper tag lists are the same as the ranked pitch order (tags describe the trade area; brands are ranked separately).
- That heatmap drives ranking (eval showed no lift).

---

## Devpost gallery checklist

The deploy50 stills are 2880x1920 PNGs (3:2, each under 1.5 MB) in `docs/devpost/gallery/`. Upload order and captions are in `docs/devpost/GALLERY_ASSETS.md` and `SUBMISSION_PACK.md`.

- [x] Gallery recaptured from production at 3:2 with plain captions
- [x] Live demo link and public MIT repo
- [ ] Video URL (optional for this hackathon) pasted once the separate video is uploaded
