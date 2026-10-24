# Devpost submission draft (LeaseUp)

**Tagline (headline):** Find the right stores for your empty retail space.

**Subhead (Devpost and video opener):** Type in an address. LeaseUp shows which brands people nearby love but can't find close by, and helps you pitch them.

**On the live landing today:** the same headline appears above a short helper line from the app: "Enter an address to see which brands local shoppers want nearby, then check real store locations before you pitch." (`LANDING_PLAIN_SUMMARY` in `apps/web/src/lib/broker-copy.ts`).

**Production reference:** Cloudflare Pages tracks branch **`cursor/leaseup-v1-c429`** (integration). Live production is labeled **deploy32** on that branch. The current integration head short SHA is in `docs/devpost/integration-head.txt` (CI verifies it is a commit on that branch; see `scripts/check-submission-doc.mjs`). Do not paste stale deploy SHAs in Devpost copy. **Mobile Lighthouse (GitHub Actions LHCI only):** median of **3** mobile runs on `ubuntu-latest` in Actions run [**40074283024**](https://github.com/AtharvRaotole/LeaseUp/actions/runs/40074283024): landing performance **93**; Wicker report performance **89**, accessibility **96** (`docs/qa/a11y-perf.md`, `LHCI_MEDIANS` in the job log). Do not cite local preview Lighthouse scores in Devpost copy.

Offline copy for the Qloo Agentic Hackathon. Numbers below come from `data/qloo-eval-40/QLOO_LIFT_EVAL.md` and `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` (40 US addresses, live Qloo API; metrics refreshed Oct 24, 2026 per PR #103).

**How to read the backtest numbers:** **P@10** is the **share of the top 10 ranked brands that already had a store in the trade area per ATP/OSM** (All The Places plus OpenStreetMap snapshot tiles in the 40-address study, with the density-adaptive eval radius). It is **not** signed leases, lease success, or proof of open whitespace. Plain-language counts are average slots present (multiply P@10 by 10). Exact means are in parentheses where we cite them.

**Pitch absence radius (live product):** When building the pitch list, dense areas use an adaptive absence check with at least a **3 km** floor (for example Wicker at 10 km search uses **3 km** for "already nearby") so brokers do not pitch chains with a store a short drive away (`prospectAbsenceRadiusKm`, `data/qloo-eval-40/ADAPTIVE_RADIUS_TRADE_AREA_AUDIT.md`). The report shows a plain funnel line (`report-prospect-funnel`): brands scored, how many already have a store within that km, and how many fit taste with none (`prospect-funnel-copy.ts`).

**Where Qloo lift shows up (do not oversell raw affinity):** Raw Qloo order does **not** beat national chain size on mean P@10 (**54%** vs **76%** on the 40-address panel; exact **0.5375** vs **0.760** in `packages/fixtures/src/eval/live-qloo-lift/aggregates.json`). The honest lift is from the **fitted logistic taste blend** (**83%** vs **76%**; exact **0.825** vs **0.760**, **+6.5 pp** in the same file) and from **ordering within a chain-size tier** (for example mid-size **P@5 0.53** vs **0.23** in the 439 to 864 store tier per `data/qloo-eval-40/QLOO_LIFT_EVAL.md`). Same-size tier AUC **0.664** [0.642, 0.687] is the pre-registered control-for-size test (`aggregates.json`, `sameSizeAuc`).

**Store verification honesty (PR #89 false-positive audit):** We removed all **4** known false positives across **13** test sites in that audit. We never claim "zero false positives": stores missing from **both** ATP and OSM cannot be detected, and OSM snapshot coverage applies to only **25** of **227** tracked chains on demo chips. Analyze also runs an **OSM `brand:wikidata` false-absence cross-check** (snapshot tiles plus demo Overpass recordings) so we do not label a top prospect as verified missing when wikidata says a store is in radius (`apps/worker/src/lib/osm-wikidata-absence-crosscheck.ts`, `data/qloo-eval-40/FALSE_ABSENCE_AUDIT.md`, `apps/worker/src/__tests__/false-absence-sweep.test.ts`).

**Shipped on deploy32 (integration head in `integration-head.txt`):**

- **13 verified brand real-estate URLs** in `brand-real-estate.json` (title/h1 content rule; parent-portal map for Gap Inc. brands only). Pitch rows link to official pages when verified, otherwise a Google search fallback (`BrandReachLine`, `scripts/check-brand-real-estate-urls.mjs`).
- **Nearest store reconciled across ATP and OSM:** `reconcileNearestStoreKm()` picks the closer distance; large ATP/OSM gaps mark distance as unconfirmed (`nearest-store-reconcile.ts`, `nearest-store-display-copy.ts`).
- **No false absences on the four demo pins (CI):** Wicker, Boulder, Sevierville, and 350 Bleecker Williamsburg fixture; `demo-chip-osm-absence-audit.test.ts` fails if OSM snapshot shows a store inside the absence radius but the report still claims absence (`docs/DEMO_NEAREST_OSM_AUDIT.md`).
- **Honest `Shared local audience` lines:** pitch copy only when the audience is in the brand's top **5** brand-only Qloo affinities and passes local overlap and lift gates (`BRAND_PITCH_CHARACTERISTIC_TOP_K`, `qloo-brand-taste-overlap.ts`, `broker-copy.ts`).
- **Address input validation:** typed addresses are rejected before geocode with plain errors for gibberish, PO boxes, non-US text, and ambiguous input (`address-input-validation.ts`, `analyze-robustness` e2e and screenshots under `docs/screenshots/analyze-robustness/`).
- **Chain-size fallback when Qloo is down:** live analyze returns national chain-size ranking with `tasteDataStatus: unavailable` and `TasteUnavailableBanner`; no fabricated taste scores (`qloo-chain-fallback.ts`, `qloo-analyze-resilience.test.ts`).

**Recording hold (owner):** Record **nothing** until Atharv explicitly says capture may start. That means no walkthrough video, no Devpost screenshots, no hero loop, and **no local test recordings** either. A message about "after the deploy" is **not** that signal. Script and doc edits are fine. When authorized, use the local stack (`pnpm record:demo:local`, `pnpm capture:devpost:local`) and set `LEASEUP_RECORDING_AUTHORIZED=1`. Production still requires `MEDIA_CAPTURE_ALLOW_PROD=1` separately.

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

Use **demo mode** on the live site (badge: **Demo data**). No API key required for the three chips below. Review with **stills** in `docs/screenshots/` only; do not record video for this pass.

### Try it in 60 seconds

Three stops judges care about: **finished report**, **shareable pitch**, **pipeline board**. Minimal click path from the landing page:

| Stop | Clicks from `/` | What you should see |
| --- | --- | --- |
| **1. Report** | **1** (click demo chip **Wicker Park, Chicago**) | Compact summary (`report-summary`): stat tiles, plain funnel (`report-prospect-funnel`, 3 km absence radius on dense Wicker), **Top brands to pitch** (`brands-to-pitch`). Dismiss or take the optional **Quick tour** (`report-first-run-tour-hint`; non-blocking). Open **How we know**, **Compare ranking** (`qloo-ranking-toggle`): **Local taste** vs **Chain size** (83% vs 76% mean top-10 presence; `e2e/qloo-ranking-toggle.spec.ts`). **Why this brand** (`why-this-brand`); full list in **Why these brands** (`brands-to-pitch-full-list`). |
| **2. Pitch pack** | **+1** open stable demo **`/pitch/demo-boulder-ulta`** (`pitch-page`, `e2e/demo-pitch-smoke.spec.ts`) **or +2** from report (**Share pitch pack** → **Create public link**) | Read-only pitch with leasing brief and vacancy block |
| **3. Pipeline + watchlist loop** | **+2** on report (**Add to pipeline** on a top brand and/or **Watch this space**, then **Pipeline** or **Watchlist** in the header) | Kanban with saved evidence (`pipeline-evidence`); open a card and follow **Site report** / **Watched space** back to the same pitch (`e2e/pipeline-loop.spec.ts`) |

**Exact demo addresses** (recorded Qloo + store fixtures; keep in sync with `packages/fixtures/src/demo-addresses.ts`):

| Chip label | Address |
| --- | --- |
| Wicker Park, Chicago | `1560 N Milwaukee Ave, Chicago, IL 60622` |
| Pearl Street, Boulder | `1300 Pearl St, Boulder, CO 80302` |
| Sevierville, TN | `125 Collier Dr, Sevierville, TN 37862` |

Manual entry path (two clicks to report): paste a chip address, click **Analyze**. Legacy aliases such as `1574 N Milwaukee Ave, Chicago, IL 60622` still route to the Wicker fixture.

**Still references (no new capture):** compact report summary before/after in `docs/screenshots/report-summary-design/`; broker comprehension stills in `docs/screenshots/broker-comprehension/after/`; older gallery: `docs/screenshots/report-light-1440.png`, `docs/screenshots/features/pipeline-light-1440.png`.

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
3. Insights merged and re-ranked with **`orderInsightsByLogisticBlend`** (coefficients in `packages/fixtures/src/eval/live-qloo-lift/logistic-coefficients.json`).
4. Heatmap is not used to order the pitch list (offline eval showed no ranking lift vs insights alone).

**Trade area shoppers (tags):**

1. Separate Qloo **location-level tag** insights via **`getTradeAreaShopperTagInsights`** (cached; demo fixtures on the three chips).
2. UI shows ordered tag **names** in groups; raw affinities are not shown on the card.

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

- Production on integration branch **`cursor/leaseup-v1-c429`** (deploy32): compact summary with prospect funnel, search vs absence radius explainer, default **fitted taste blend** with **Compare ranking** toggle (**83%** vs **76%** on the 40-address eval), non-blocking tour, stable **`/pitch/demo-boulder-ulta`**, OSM wikidata false-absence cross-check, **`brands-to-pitch`**, pipeline evidence loop, watchlist hardening (#107), **13** verified reach URLs, ATP/OSM nearest-store reconcile, demo-pin absence CI audit, gated **Shared local audience** copy, address validation, and **Qloo-down fallback**.
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

- Re-record the judge walkthrough locally only after Atharv explicitly authorizes recording.
- Expand live-address coverage and refresh logistic coefficients on a schedule.
- More verified brand real-estate URLs in `brand-real-estate.json` for reach lines.

---

## Three-minute demo video script (180 seconds)

**Format:** 1440x900 light mode, visible cursor overlay, no browser chrome. **Do not run this script** until Atharv authorizes recording (`LEASEUP_RECORDING_AUTHORIZED=1`), then use `pnpm record:demo:local` only.

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

Use **existing** screenshots only (no new capture, no video) until recording is authorized. Pick **5 to 7** images from `docs/devpost/GALLERY_ASSETS.md` (paths, captions, and optional alternates). Upload at Devpost's recommended size; source PNGs stay in `docs/screenshots/`.

- [ ] Gallery images chosen from `docs/devpost/GALLERY_ASSETS.md` with plain captions (no inflated claims)
- [ ] Link to live demo (deploy32 / integration branch); integration head in `docs/devpost/integration-head.txt` only
- [ ] Do **not** add `walkthrough.mp4` until owner authorizes recording
