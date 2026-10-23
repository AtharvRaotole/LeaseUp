# Devpost submission draft (LeaseUp)

**Tagline (headline):** Find the right stores for your empty retail space.

**Subhead (Devpost and video opener):** Type in an address. LeaseUp shows which brands people nearby love but can't find close by, and helps you pitch them.

**On the live landing today:** the same headline appears above a short helper line from the app: "Enter an address to see which brands local shoppers want nearby, then check real store locations before you pitch." (`LANDING_PLAIN_SUMMARY` in `apps/web/src/lib/broker-copy.ts`).

Offline copy for the Qloo Agentic Hackathon. Numbers below come from `data/qloo-eval-40/QLOO_LIFT_EVAL.md` and `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` (40 US addresses, live Qloo API, October 23, 2026).

**How to read the backtest numbers:** In the 40-address study, **P@10** is the share of a ranker's **top 10** brands that **already had a store** in the trade area per All The Places and OpenStreetMap tiles, using the study's adaptive radius rule. It measures "already here" overlap with open data, not lease outcomes or guaranteed whitespace. Plain-language counts below are the average number of those top-10 slots that were present (multiply P@10 by 10). Exact metrics stay in parentheses.

Do not claim raw Qloo affinity beats national chain size on mean top-10 presence.

**Recording hold (owner):** Record **nothing** until Atharv explicitly says capture may start. That means no walkthrough video, no Devpost screenshots, no hero loop, and **no local test recordings** either. A message about "after the deploy" is **not** that signal. Script and doc edits are fine. When authorized, use the local stack (`pnpm record:demo:local`, `pnpm capture:devpost:local`) and set `LEASEUP_RECORDING_AUTHORIZED=1`. Production still requires `MEDIA_CAPTURE_ALLOW_PROD=1` separately.

---

## Inspiration

Brokers and landlords lose time pitching chains that already operate inside the trade area. National chain size is a strong guess for who is "already here," but it does not tell you which mid-size brands fit a specific block. We built LeaseUp to combine Qloo Taste AI with open store footprints so a broker can walk into a landlord meeting with a ranked list, a map, and numbers that survive scrutiny.

---

## What it does

LeaseUp turns a storefront address into a broker-ready pitch workflow. Shipped on integration today:

### Landing redesign

- Split hero: copy and address form on the left, **`LandingHeroProductPreview`** on the right (`data-testid="landing-hero-product-preview"`).
- Static Wicker Park report screenshot (AVIF/WebP in `apps/web/public/landing/`), not autoplay video. Links to the live Wicker demo report.
- Trade area (2, 5, or 10 km) and category filters on the same form; demo chips for Wicker, Boulder, and Sevierville.
- Below the fold: three step cards, proof copy from `landing-eval-copy`, feature tiles (pitch pack, pipeline, vacancy cost, portfolio), and footer (`LandingBelowFold`, `LandingPageFooter`).

### Summary-first report

- **`ReportSummaryAboveFold`** (`data-testid="report-summary"`): headline stats, plain summary line, **Top brands to pitch** (top five with one-line reasons), and primary actions **Share pitch pack** and **Add to pipeline**.
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

### Still in the flow

- Geocode confirm when needed; ranked list uses taste-aware logistic blend; store checks via All The Places (227 tracked chains) and OSM on demo chips; Qloo proof and strict eval under **How we know**; pipeline kanban; optional **OutreachSheet** draft (broker clicks, never auto-sent).

Demo chips use recorded Qloo JSON so judge demos stay fast.

---

## How we built it

### Stack

- **Web:** React, Vite, MapLibre GL, TanStack Query on Cloudflare Pages.
- **API:** Cloudflare Worker (Hono), response cache for successful upstream calls, D1 for portfolio, pipeline, and metrics.
- **Quality:** Playwright e2e (including `who-shops-here.spec.ts`), Lighthouse CI, CSP regression, worker bundle guard, Vitest on copy and ranking helpers.

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

- Landing redesign with hero product preview and summary-first report on integration.
- Trade area shopper tags from Qloo location insights; brand reach lines on report and pitch pack.
- Vacancy cost on report, share dialog, and pitch snapshot; owner update share links from pipeline.
- Preregistered **40-address** live Qloo evaluation with committed aggregates in the repo.
- Same-size tier AUC **0.667**; logistic blend **P@10 0.82 vs 0.76** for the "already here" top-10 check on that panel (OSM-retiled ground truth).
- Mid-size tier example: about **3** of top **5** vs about **1** of **5** (**P@5 0.53 vs 0.23** in the eval tier table).

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
