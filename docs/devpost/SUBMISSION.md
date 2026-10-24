# Devpost submission draft (LeaseUp)

**Tagline (headline):** Find the right stores for your empty retail space.

**Subhead (Devpost and video opener):** Type in an address. LeaseUp shows which brands people nearby love but can't find close by, and helps you pitch them.

**On the live landing today:** the same headline appears above a short helper line from the app: "Enter an address to see which brands local shoppers want nearby, then check real store locations before you pitch." (`LANDING_PLAIN_SUMMARY` in `apps/web/src/lib/broker-copy.ts`).

**Production reference:** Cloudflare Pages at commit **`60e57c3`** (demo chips + live mode). Mobile Lighthouse on local production preview (`docs/qa/a11y-perf.md`): landing performance **about 93**, Wicker report **67** (five-run median; accessibility 100 on both).

Offline copy for the Qloo Agentic Hackathon. Numbers below come from `data/qloo-eval-40/QLOO_LIFT_EVAL.md` and `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` (40 US addresses, live Qloo API, October 23, 2026).

**How to read the backtest numbers:** **P@10** means the share of the **top 10** that **already had a store in the trade area per ATP/OSM** (All The Places plus OpenStreetMap snapshot tiles in the 40-address study, with the adaptive radius rule). It is **not** signed leases, lease success, or proof of open whitespace. Plain-language counts below are the average number of those top-10 slots that were present (multiply P@10 by 10). Exact metrics stay in parentheses.

**Where Qloo lift shows up (do not oversell raw affinity):** Raw Qloo order does **not** beat national chain size on mean P@10 (**0.54** vs **0.76** on the 40-address panel). The honest lift is from the **fitted logistic taste blend** (**0.82** vs **0.76**) and from **ordering within a chain-size tier** (for example mid-size **P@5 0.53** vs **0.23** in the 439 to 864 store tier). Same-size tier AUC **0.667** [0.646, 0.689] is the pre-registered control-for-size test.

**Store verification honesty (PR #89 false-positive audit):** We removed all **4** known false positives across **13** test sites in that audit. We never claim "zero false positives": stores missing from **both** ATP and OSM cannot be detected, and OSM snapshot coverage applies to only **25** of **227** tracked chains on demo chips.

**Recording hold (owner):** Record **nothing** until Atharv explicitly says capture may start. That means no walkthrough video, no Devpost screenshots, no hero loop, and **no local test recordings** either. A message about "after the deploy" is **not** that signal. Script and doc edits are fine. When authorized, use the local stack (`pnpm record:demo:local`, `pnpm capture:devpost:local`) and set `LEASEUP_RECORDING_AUTHORIZED=1`. Production still requires `MEDIA_CAPTURE_ALLOW_PROD=1` separately.

---

## Devpost judging criteria (plain English)

### Technological Implementation

LeaseUp is a real split stack: a React site on Cloudflare Pages talks to a Hono worker that batches live Qloo `/v2/insights` brand calls (45 IDs per request, 227 tracked chains), merges them with a fitted logistic taste blend, and checks open store footprints from All The Places and OSM before a broker pitches. If Qloo returns errors in live mode, analysis **falls back to chain-size ranking** with a visible banner (`TasteUnavailableBanner`, `qloo-chain-fallback.ts`). Pipeline cards persist **prospect status**, **notes**, **follow-up reminders**, and **evidence** (reasons + links back to the report and watchlist). We preregistered a **40-address** live API study, fixed a ground-truth bug in OSM tiles, and committed the headline metrics in the repo. Raw Qloo order reached **P@10 0.54** on that panel; national chain size reached **0.76**; our shipped blend reached **0.82** (**+6.2** percentage points vs chain, 95% CI **2.8 to 9.3**). Among similar-size chains, Qloo separated present vs absent about two thirds of the time (**same-size tier AUC 0.667**, 95% CI **0.646 to 0.689**). We do not use Qloo heatmap to rank the pitch list.

### Design

Brokers see a summary-first report with **brand-specific one-line reasons** (taste rank, distance to nearest store, shopper interest, category fit), trade area shopper tags as plain names, vacancy math they control, and a shareable pitch pack. A **plain-language pass** keeps jargon off primary surfaces (`broker-visible-jargon.ts`, `broker-jargon.spec.ts`); methodology metrics use labels and tooltips (`TableMetricLabel`, `eval-display.ts`). The landing pairs the address form with a static product preview. **How we know** shows proof beside chain-size baselines (raw Qloo **54%** vs chain **76%** mean top-10 presence per ATP/OSM on the 40-address study; blend **82%**). **`/methodology/qloo`** explains Qloo in plain broker language.

### Potential Impact

Empty storefronts cost landlords carry every month; brokers waste outreach on chains that already operate nearby. LeaseUp shortens the path from address to a defensible shortlist: ranked brands, map context, reach lines when we have them, pipeline and owner-update links. The eval shows the biggest lift on mid-size chains landlords actually pitch (**P@5 0.53** vs **0.23** when ordering within the 439 to 864 store tier). Random guessing on the same panel only hits **P@10 0.29**.

### Quality of Idea

The idea is to treat Qloo as **local taste beyond chain size**, not a replacement for footprint data. Raw Qloo order is weaker than chain size on mean P@10; the product story is the **blend** (**0.82** vs **0.76**) and **within-tier** ordering (mid-size **P@5 0.53** vs **0.23**). P@10 still means stores already in the trade area per ATP/OSM, not leases or guaranteed whitespace.

---

## Judge path (try the product + where to verify)

Use **demo mode** on the live site (badge: **Demo data**). No API key required for the three chips below. Review with **stills** in `docs/screenshots/` only; do not record video for this pass.

### Try it in 60 seconds

Three stops judges care about: **finished report**, **shareable pitch**, **pipeline board**. Minimal click path from the landing page:

| Stop | Clicks from `/` | What you should see |
| --- | --- | --- |
| **1. Report** | **1** (click demo chip **Wicker Park, Chicago**) | Summary report (`report-summary`): top brands, map column, proof under **How we know** |
| **2. Pitch pack** | **+2** on report (**Share pitch pack** → **Create public link**, then open the pitch URL) | Read-only pitch page (`pitch-page`) with leasing brief and vacancy block |
| **3. Pipeline + watchlist loop** | **+2** on report (**Watch this space** and/or **Add to pipeline**, then **Pipeline** or **Watchlist** in the header) | Kanban with saved evidence (`pipeline-evidence`); card links back to **Site report** and **Watched space** (`e2e/pipeline-loop.spec.ts`) |

**Exact demo addresses** (recorded Qloo + store fixtures; keep in sync with `packages/fixtures/src/demo-addresses.ts`):

| Chip label | Address |
| --- | --- |
| Wicker Park, Chicago | `1560 N Milwaukee Ave, Chicago, IL 60622` |
| Pearl Street, Boulder | `1300 Pearl St, Boulder, CO 80302` |
| Sevierville, TN | `125 Collier Dr, Sevierville, TN 37862` |

Manual entry path (two clicks to report): paste a chip address, click **Analyze**. Legacy aliases such as `1574 N Milwaukee Ave, Chicago, IL 60622` still route to the Wicker fixture.

**Still references (no new capture):** post plain-language pass stills in `docs/screenshots/broker-comprehension/after/` (report, pitch, pipeline, watchlist, methodology at 1440 and 390). Older gallery: `docs/screenshots/report-light-1440.png`, `docs/screenshots/features/pipeline-light-1440.png`.

**In-app Qloo explainer (brokers):** [How LeaseUp uses Qloo](/methodology/qloo) from the methodology page (`apps/web/src/pages/HowLeaseUpUsesQlooPage.tsx`).

### Feature map to official criteria

Eval numbers below are only from `data/qloo-eval-40/QLOO_LIFT_EVAL.md` and `packages/fixtures/src/eval/` (40-address panel, Oct 2026). **TI** = Technological Implementation, **Des** = Design, **Imp** = Potential Impact, **Idea** = Quality of Idea.

| Feature | TI | Des | Imp | Idea | Proof in repo |
| --- | --- | --- | --- | --- | --- |
| Landing + demo chips (3 addresses) | | ✓ | ✓ | | `apps/web/src/data/landing-demo-chips.ts`, `apps/web/src/pages/LandingPage.tsx` |
| Hero product preview (static Wicker still) | | ✓ | ✓ | | `apps/web/src/components/landing/LandingHeroProductPreview.tsx` |
| Qloo `/v2/insights` brand batching (45 IDs, 227 chains) | ✓ | | | ✓ | `apps/worker/src/providers/qloo.ts`, `apps/worker/src/services/analysis.ts` |
| Logistic taste blend ranking (shipped) | ✓ | | | ✓ | `packages/fixtures/src/eval/live-qloo-lift/logistic-coefficients.json`, `apps/worker/src/lib/analysis-enrichment.ts` |
| Qloo-down chain-size fallback | ✓ | ✓ | ✓ | | `apps/worker/src/lib/qloo-chain-fallback.ts`, `apps/worker/src/__tests__/qloo-analyze-resilience.test.ts`, `apps/web/src/components/report/TasteUnavailableBanner.tsx` |
| Brand-specific pitch reasons (per prospect) | ✓ | ✓ | ✓ | ✓ | `apps/worker/src/services/analysis.ts`, `apps/web/src/lib/prospect-one-line.ts`, `apps/worker/src/__tests__/prospect-reasons.test.ts` |
| Report → pipeline → watchlist loop | ✓ | | ✓ | | `e2e/pipeline-loop.spec.ts`, `apps/worker/migrations/0005_pipeline_card_evidence_watch.sql` |
| Pipeline statuses, notes, reminders | ✓ | ✓ | ✓ | | `apps/web/src/lib/pipeline-status.ts`, `apps/web/src/components/pipeline/PipelineCardDialog.tsx` |
| Plain-language broker copy pass | | ✓ | ✓ | | `apps/web/src/lib/broker-visible-jargon.ts`, `e2e/broker-jargon.spec.ts`, `docs/qa/a11y-perf.md` |
| How LeaseUp uses Qloo (`/methodology/qloo`) | ✓ | ✓ | | ✓ | `apps/web/src/pages/HowLeaseUpUsesQlooPage.tsx`, `apps/web/src/lib/qloo-broker-explainer-copy.ts` |
| Mobile Lighthouse (local preview) | ✓ | ✓ | | | `docs/qa/a11y-perf.md` (landing ~93 perf, report **67** perf mobile, five-run median) |
| Trade area shopper tags (location insights) | ✓ | ✓ | ✓ | | `apps/worker/src/lib/trade-area-shoppers.ts`, `apps/web/src/components/report/WhoShopsHereCard.tsx` |
| Store presence checks (ATP + OSM on chips) | ✓ | ✓ | ✓ | | `packages/fixtures/src/store-locations.json`, `apps/worker/src/lib/analysis-enrichment.ts`; false-positive audit (PR #89): removed all 4 known false positives across 13 test sites (not zero FP; OSM covers 25/227 chains) |
| Summary-first report + collapsible depth | | ✓ | ✓ | | `apps/web/src/components/report/ReportSummaryAboveFold.tsx` |
| Qloo proof strip + strict eval card | ✓ | ✓ | | ✓ | `apps/web/src/lib/qloo-proof.ts`, `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` |
| Vacancy cost (report, share, pitch) | | ✓ | ✓ | | `apps/web/src/components/report/VacancyCostCalculator.tsx`, `apps/web/src/pages/PitchPage.tsx` |
| Pitch pack share link | ✓ | ✓ | ✓ | | `apps/web/src/components/report/SharePitchDialog.tsx`, `apps/worker/src/services/pipeline.ts` (pitch API) |
| Pipeline kanban + D1 cards | ✓ | | ✓ | | `apps/web/src/pages/PipelinePage.tsx`, `apps/worker/src/lib/pipeline-cards-db.ts` |
| Owner update share from pipeline | ✓ | ✓ | ✓ | | `apps/web/src/components/pipeline/OwnerUpdatePanel.tsx`, `apps/worker/src/lib/owner-update.ts` |
| Brand reach lines | | ✓ | ✓ | | `apps/web/src/components/report/BrandReachLine.tsx`, `packages/fixtures/src/brand-real-estate.json` |
| Portfolio batch (up to 10 sites) | ✓ | | ✓ | | `apps/web/src/pages/PortfolioPage.tsx` |
| Brand sites / heatmap explore (not used to rank pitch list) | ✓ | ✓ | | ✓ | `apps/web/src/pages/BrandPage.tsx`; heatmap lift: `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` (`heatmapAddsLift: false`) |
| Watchlist + diff | ✓ | ✓ | ✓ | | `apps/web/src/pages/WatchlistPage.tsx`, `packages/fixtures/src/watch-diff.ts` |
| Methodology + 40-address tables | ✓ | ✓ | | ✓ | `apps/web/src/pages/MethodologyPage.tsx`, `packages/fixtures/src/eval/results_adaptive.json` |
| Preregistered 40-address live Qloo eval | ✓ | | | ✓ | `data/qloo-eval-40/QLOO_LIFT_EVAL.md`, `packages/fixtures/src/eval/live-qloo-lift/QLOO_LIFT_EVAL.md` |

**Eval-backed claims tied to features above (same sources only):**

| Claim | Value | Where committed |
| --- | --- | --- |
| Raw Qloo mean P@10 (adaptive radius) | 0.54 | `packages/fixtures/src/eval/live-qloo-lift/aggregates.json`, `data/qloo-eval-40/QLOO_LIFT_EVAL.md` |
| Chain size mean P@10 | 0.76 | same |
| Logistic blend mean P@10 vs chain | 0.82 vs 0.76 (+6.2 pp, 95% CI 2.8 to 9.3) | same |
| Same-size tier AUC | 0.667 [0.646, 0.689] | same |
| Random P@10 | 0.29 | `data/qloo-eval-40/QLOO_LIFT_EVAL.md` (T1 adaptive) |
| Mid-size tier P@5 (439 to 864 stores), Qloo vs chain | 0.53 vs 0.23 | `data/qloo-eval-40/QLOO_LIFT_EVAL.md` (T4), `packages/fixtures/src/eval/tables.md` |
| Wicker adaptive row (blend vs chain P@10 at 1.5 km) | 0.9 vs 0.7 | `data/qloo-eval-40/QLOO_LIFT_EVAL.md` (demo addresses), `packages/fixtures/src/demo-adaptive-proof.ts` |

---

## Inspiration

Brokers and landlords lose time pitching chains that already operate inside the trade area. National chain size is a strong guess for who is "already here," but it does not tell you which mid-size brands fit a specific block. We built LeaseUp to combine Qloo Taste AI with open store footprints so a broker can walk into a landlord meeting with a ranked list, a map, and numbers that survive scrutiny.

---

## What it does

LeaseUp turns a storefront address into a broker-ready pitch workflow. Shipped live at **`60e57c3`**:

### Landing redesign

- Split hero: copy and address form on the left, **`LandingHeroProductPreview`** on the right (`data-testid="landing-hero-product-preview"`).
- Static Wicker Park report screenshot (AVIF/WebP in `apps/web/public/landing/`), not autoplay video. Links to the live Wicker demo report.
- Trade area (2, 5, or 10 km) and category filters on the same form; demo chips for Wicker, Boulder, and Sevierville.
- Below the fold: three step cards, proof copy from `landing-eval-copy`, feature tiles (pitch pack, pipeline, vacancy cost, portfolio), and footer (`LandingBelowFold`, `LandingPageFooter`).

### Summary-first report

- **`ReportSummaryAboveFold`** (`data-testid="report-summary"`): headline stats, plain summary line, **Top brands to pitch** (top five with **brand-specific one-line reasons** from `prospectOneLineReason` plus deeper `reasons[]` on each prospect from analysis), per-row **Add to pipeline**, and primary actions **Share pitch pack** and **Add to pipeline**.
- **`WatchSpaceButton`** (`watch-this-space`) saves the address to **Watchlist** for later diff alerts.
- Deeper sections collapse under **Why these brands**, **What it costs you**, and **How we know** (`ReportCollapsibleSection`).
- Map column: ranked map, **Why this brand** for the selection, sidebar facts, and **Trade area shoppers** when data is available.

### Trade area shoppers (Qloo tags)

- **`WhoShopsHereCard`** (`data-testid="who-shops-here"`), titled **Trade area shoppers** in the UI.
- Ordered tag names from Qloo **location** insights (not brand affinity scores; tooltip explains scores cluster near 1).
- Live: `getTradeAreaShopperTagInsights` on the worker (`apps/worker/src/lib/trade-area-shoppers.ts`). Demo: recorded fixtures under `packages/fixtures/src/trade-area-shoppers/`.

### Who to contact (brand reach)

- **`BrandReachLine`** (`data-testid="brand-reach-line"`) on the pitch list (`BrandsToPitch`) and on each brand block in **`PitchPackBrief`**.
- When `brand-real-estate.json` has a verified URL, shows **How to reach them: Official real-estate page**. Otherwise a plain fallback line from `brand-reach-copy.ts`.
- Pitch pack also has a dashed **contact slot** when no reach record exists yet.

### Vacancy cost

- Report section **What it costs you** (`report-section-vacancy-costs`): **`VacancyCostCalculator`** plus storefront size control. Inputs persist per address in local storage.
- **Share pitch pack** dialog and frozen **pitch page** include the same vacancy block; snapshot can store values on the link.

### Pitch pack

- **`PitchPackBrief`** (`data-testid="pitch-pack-brief"`): leasing brief per brand, fit lines, store verification labels, optional map on the first brand, trade area facts, reach line, and print-friendly layout on **`PitchPage`** (`data-testid="pitch-page"`).

### Owner update

- **`OwnerUpdatePanel`** on **`PipelinePage`** (`data-testid="owner-update-panel"`): pick a property from pipeline cards, preview contacted brands and stages, share a read-only link at `/owner-update/:id` (`OwnerUpdatePage`, `data-testid="owner-update-page"`).

### Pipeline CRM (statuses, notes, reminders)

- Kanban stages use broker labels: **To pitch**, **Drafted**, **Sent by me**, **Replied**, **Touring**, **LOI**, **Passed** (`apps/web/src/lib/pipeline-status.ts`).
- **`PipelineCardDialog`**: free-text **notes**, optional **next step reminder** (`followUpAt`), outreach draft, and **evidence snapshot** (saved pitch reasons + links to the site report and watched space).
- Keyboard and axe coverage: `e2e/pipeline-keyboard-a11y.spec.ts`, `e2e/pipeline-crm.spec.ts`.

### Report → pipeline → watchlist loop

1. Run a demo-chip report.
2. **Watch this space** to save the listing; **Add to pipeline** on a top brand (or from the pitch list).
3. Open **Pipeline** or **Watchlist** from the header; open a card to see **evidence** and jump back to the report or watch entry.

### Qloo-down fallback (live)

- When taste insights cannot be fetched, the worker still returns a ranked list by **national chain size**, sets `tasteDataStatus: unavailable`, and the report shows **`TasteUnavailableBanner`** with plain copy (`e2e/qloo-down.spec.ts`). Demo chips are unaffected (recorded taste JSON).

### Plain-language UX + methodology

- Broker-visible surfaces avoid raw metric jargon; proof and methodology pages define terms inline (`apps/web/src/lib/eval-display.ts`, `StrictEvalCard`, `ProofSection`).
- **`/methodology/qloo`**: short **How LeaseUp uses Qloo** page linked from the methodology hub (no internal "do not say" editor language).

### Still in the flow

- Geocode confirm when needed; ranked list uses taste-aware logistic blend when Qloo is available; store checks via All The Places (227 tracked chains) and OSM on demo chips; Qloo proof under **How we know** cites **54% / 76% / 82%** mean top-10 presence (raw Qloo / chain / blend) per `data/qloo-eval-40/QLOO_LIFT_EVAL.md`; optional **OutreachSheet** draft (broker clicks, never auto-sent).

Demo chips use recorded Qloo JSON so judge demos stay fast.

---

## How we built it

### Stack

- **Web:** React, Vite, MapLibre GL, TanStack Query on Cloudflare Pages.
- **API:** Cloudflare Worker (Hono), response cache for successful upstream calls, D1 for portfolio, pipeline, and metrics.
- **Quality:** Playwright e2e (broker jargon, pipeline loop, Qloo-down, CRM), Lighthouse CI (mobile report perf **67**, landing **~93** per `docs/qa/a11y-perf.md`), CSP regression, worker bundle guard, Vitest on copy and ranking helpers.

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

**Evaluation honesty (broker read, then exact):** Across 40 US addresses, ranking by raw Qloo affinity put about **5** brands in the top 10 that already had a store in the trade area on average (**P@10 0.54**). Sorting by national chain size put about **8** of those top 10 slots on brands already there (**P@10 0.76**). The legacy 0.75/0.25 blend averaged about **6** (**P@10 0.59**). The fitted logistic taste blend averaged about **8**, slightly better than size alone (**P@10 0.82**, **+6.2** percentage points vs chain, 95% CI **2.8 to 9.3** pp). Among brands of similar chain size, Qloo's score separated present vs not present about two thirds of the time (**same-size tier AUC 0.667**, 95% CI **0.646 to 0.689**). Ground truth was recomputed after fixing OSM snapshot tile coordinates; Qloo responses are unchanged.

---

## Challenges

1. **Telling the truth about Qloo:** raw affinity puts fewer "already here" brands in the top 10 than chain size alone (about 5 vs about 8 of 10 slots on average; **P@10 0.54 vs 0.76**). We rebuilt ranking around the logistic blend and show chain-size baselines beside taste rankings.
2. **Dense trade areas:** a fixed 10 km presence check saturates. Adaptive radius in backtests breaks the tie.
3. **Broker-readable UI:** summary-first report, plain headline copy, shopper tags without misleading affinity decimals, and reach lines that admit when contact data is missing.
4. **Split hosting and KV budget:** Pages vs Worker API, pipeline cookies, local-only media capture, and cached Qloo responses.

---

## Accomplishments

- Live at **`60e57c3`**: summary report with **brand-specific reasons**, **watchlist**, **pipeline evidence loop**, statuses/notes/reminders, and **Qloo-down fallback**.
- Trade area shopper tags; brand reach lines; vacancy cost on report, share dialog, and pitch snapshot; owner update share links.
- Plain-language broker pass + **`/methodology/qloo`** explainer; mobile Lighthouse **67** on report (five-run median), **~93** on landing (local preview audit).
- Preregistered **40-address** live Qloo evaluation: mean top-10 presence **54% / 76% / 82%** (raw Qloo / chain / blend) per ATP/OSM; same-size tier AUC **0.667**; mid-size tier **P@5 0.53 vs 0.23**.

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
| 0:18-0:30 | Report summary | Hold on `report-summary`: headline, plain summary, **Top brands to pitch**. "Summary first, then detail on demand." |
| 0:30-0:40 | Trade area shoppers | Scroll map column to **Trade area shoppers** (`who-shops-here`). "Qloo location tags describe who shops here, as ordered names, not fake-precise scores." |
| 0:40-0:50 | Who to contact | In **Why these brands**, expand a row with **How to reach them** (`brand-reach-line`) or show the dashed slot. "Official real-estate link when we have it." |
| 0:50-1:00 | Vacancy cost | Open **What it costs you**. Adjust vacancy calculator briefly. "Landlords see carrying cost in their own inputs." |
| 1:00-1:12 | Qloo proof | Open **How we know** if collapsed. Qloo proof strip. "On 40 addresses, raw Qloo filled about 5 of 10 top slots with brands already in the footprint (P@10 0.54). Chain size about 8 (0.76). Our blend about 8, slightly better (0.82)." |
| 1:12-1:22 | Share pitch pack | Click **Share pitch pack**, **Create public link**. Show link field. |
| 1:22-1:38 | Pitch pack | Open pitch tab. Hold on **Leasing brief** and first brand: map, fit bullets, **How to reach them**, vacancy section on page. |
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

- [ ] 5-6 PNGs at 1600x1000 in `docs/media/devpost/` via `pnpm capture:devpost:local` (after owner authorization only)
- [ ] `walkthrough.mp4` / `walkthrough.webm` from local capture (after owner authorization only)
- [ ] Link to live demo when allowed; note commit SHA for local captures
