# Devpost submission draft (LeaseUp)

Offline copy for the Qloo Agentic Hackathon. Numbers below come from `data/qloo-eval-40/QLOO_LIFT_EVAL.md` and `packages/fixtures/src/eval/live-qloo-lift/aggregates.json` (40 US addresses, live Qloo API, October 23, 2026). Do not claim raw Qloo affinity beats national chain size on mean top-10 presence.

**Media note:** Gallery screenshots and the judge walkthrough should be captured on the **local demo stack** (`pnpm capture:devpost:local`, `pnpm record:demo:local`) until production recording is explicitly approved. `MEDIA_CAPTURE_ALLOW_PROD=1` is for after KV budget reset only.

---

## Inspiration

Brokers and landlords lose time pitching chains that already operate inside the trade area. National chain size is a strong guess for who is "already here," but it does not tell you which mid-size brands fit a specific block. We built LeaseUp to combine Qloo Taste AI with open store footprints so a broker can walk into a landlord meeting with a ranked list, a map, and numbers that survive scrutiny.

---

## What it does

LeaseUp turns a storefront address into a broker-ready pitch workflow:

1. **Geocode** the pin (Nominatim in live mode; three recorded US demo addresses for fast judge demos).
2. **Rank brands** with a taste-aware logistic blend (Qloo rank, national chain size, trade-area density), not raw affinity alone.
3. **Verify absence** using All The Places store locations (227 tracked chains, CC0 snapshot) and OpenStreetMap on demo chips.
4. **Show proof** on the report: same candidate pool compared to a chain-size baseline, with backtest metrics that use an adaptive presence radius so dense cores do not saturate at 10/10 ties.
5. **Share** a frozen pitch pack link (rankings, map snapshot, vacancy math) and track prospects on a **pipeline** board.

Demo chips: Wicker Park Chicago (`1560 N Milwaukee Ave, Chicago, IL 60622`), Boulder Pearl Street, and Sevierville TN use recorded Qloo JSON so demos stay fast and reproducible.

---

## How we built it

### Stack

- **Web:** React, Vite, MapLibre GL, TanStack Query on Cloudflare Pages.
- **API:** Cloudflare Worker (Hono), KV cache for successful upstream responses, D1 for portfolio, pipeline, and metrics.
- **Quality:** Playwright e2e, Lighthouse CI, CSP regression on the Wicker report map, worker bundle guard, Vitest on ranking and copy helpers.

### Exactly how Qloo is used

**Live site reports (`APP_MODE=live`, `QLOO_API_KEY` set):**

1. After geocoding, the worker builds a **point location** for Qloo: WKT `POINT(lon lat)` plus `signal.location.radius` in meters from the user radius (2, 5, or 10 km).
2. For each tracked brand we call **`GET /v2/insights`** with:
   - `filter.type=urn:entity:brand`
   - `filter.results.entities` in batches of **45** brand IDs (227 chains total, `take` capped at **50** per Qloo limits)
   - `feature.explainability=true` where supported
3. Responses are cached in KV (successful calls only) to protect rate limits and latency.
4. Insights are merged, then **re-ranked in-app** with `orderInsightsByLogisticBlend` (coefficients in `packages/fixtures/src/eval/live-qloo-lift/logistic-coefficients.json`, fit leave-one-address-out on the 40-address panel).
5. **Heatmap** cells are optional for map paint in live mode; offline eval showed heatmap did **not** improve ranking lift versus insights alone, so heatmap is not used to order the pitch list.

**Demo mode:** the same pipeline runs, but Qloo responses are served from **recorded fixtures** (Wicker, Boulder, Sevierville) so judges see real-shaped JSON without burning API quota on every click.

**Brand reverse (`/brand`):** heatmap-style exploration when live; fixtures in demo.

**Evaluation honesty:** the methodology page and Qloo proof card cite the **40-address** study: raw Qloo P@10 **0.54**, chain size P@10 **0.76**, legacy 0.75/0.25 blend P@10 **0.59**, same-size tier AUC **0.672** (95% CI **0.650 to 0.693**), logistic blend P@10 **0.82** (**+6.5** percentage points vs chain, 95% CI **3.2 to 9.5** pp). Product copy matches those committed aggregates.

---

## Challenges

1. **Telling the truth about Qloo:** raw affinity order loses to chain size on mean P@10 (0.54 vs 0.76 on adaptive radius). We rebuilt ranking around the logistic blend and surface chain-size baselines beside taste rankings.
2. **Dense trade areas:** a fixed 10 km presence check saturates (for example Wicker can show 10/10 for both rankers). Adaptive radius in backtests breaks the tie and matches how brokers think about "already here."
3. **Split hosting:** Pages and the Worker API are different origins; pipeline cookies, CSP `connect-src`, and share previews required explicit e2e coverage.
4. **Operational limits:** KV write budget and Qloo rate limits pushed us toward fixture-backed demos, local-only media capture scripts, and cached insights.

---

## Accomplishments

- End-to-end flow: address to ranked list, map, Qloo proof card, shareable pitch pack, and pipeline CRM-style board.
- Preregistered **40-address** live Qloo evaluation with reproducible scripts and committed aggregates in the repo.
- Same-size tier AUC **0.672** shows Qloo adds signal beyond chain size; logistic blend raises P@10 from **0.76** to **0.82** on that panel.
- Within mid-size chain tier, Qloo-ordered P@5 **0.53** vs chain order **0.23** (from the eval writeup tier table).
- Demo mode plus recorded walkthrough assets so judges can replay Wicker without depending on live API during scoring.

---

## What we learned

- Qloo affinity is highly compressed and partly encodes "brands that already operate nearby," so **residual taste fit within a chain-size tier** is the right mental model for brokers.
- A fixed 0.75/0.25 Qloo/count blend was **worse** than chain size alone on the 40-address panel (P@10 **0.59** vs **0.76**); the fitted logistic blend is what makes taste data help rather than hurt.
- Heatmap at one cell per brand was not worth the extra calls for ranking (offline AUC delta near zero; insights affinity is the workhorse).
- Landlords trust **absence checks** and side-by-side baselines more than a single "AI score."

---

## What's next

- Ship the **summary-first** report layout to production, then re-record the judge walkthrough locally.
- Expand live-address coverage beyond the 40-site panel and refresh coefficients on a schedule.
- Portfolio views that track how Qloo fit and pipeline stage change over time for the same pin.
- Optional: landlord-facing PDF polish and outreach drafts (still broker-triggered, never auto-sent).

---

## Three-minute demo video script (180 seconds)

**Format:** 1440x900 light mode, visible cursor overlay, no browser chrome in final export. Capture with `pnpm record:demo:local` after the summary-first redesign is on the branch you want to show. Replace placeholder titles if on-screen copy changes.

**Narration tone:** plain, confident, no hype; cite proof only when the Qloo proof card is on screen.

### Shot list (timed)

| Time | Shot | Action / narration |
| --- | --- | --- |
| 0:00-0:08 | Landing hero | Full landing, light mode. "LeaseUp ranks retail tenants for a storefront using Qloo taste data and open store footprints." |
| 0:08-0:18 | Address entry | Type `1560 N Milwaukee Ave, Chicago, IL 60622`. Pause on full string. "Start with an address brokers actually pitch." |
| 0:18-0:22 | Analyze | Click **Analyze**. Cut on button depress. |
| 0:22-0:35 | Report summary (above fold) | Hold on summary-first headline, fit line, and top prospects. "In seconds you get a ranked shortlist and a plain-language summary for the landlord." |
| 0:35-0:48 | Qloo proof card | Scroll or expand proof strip. "We do not hide the science: on 40 US addresses, raw Qloo order hits 54% top-10 presence; chain size hits 76%. Our logistic blend reaches 82%." |
| 0:48-0:58 | Map | Pan map slightly; cursor over 2 pins. "Map plus All The Places checks show who is already in the radius." |
| 0:58-1:12 | Why this brand | Open first brand; hold on Why card (zoom if needed). "Each row explains rank, chain size tier, and taste fit beyond size." |
| 1:12-1:22 | Proof toggle | Toggle chain-size vs taste-aware baseline if available. "Same pool, two orderings: taste adds lift where chain size alone cannot." |
| 1:22-1:32 | Slope / compare | Smooth scroll to "Same brands, different places" (or equivalent compare section). Brief hold. "Brokers see how rankings shift by place, not a generic national list." |
| 1:32-1:42 | Share pitch | Click **Share pitch**, **Create public link**. Show link field (clipboard ok). "One click freezes rankings and map for the landlord link." |
| 1:42-1:52 | Pitch pack tab | Open pitch page in new tab; hold on executive summary block. "The pitch pack is read-only and printable." |
| 1:52-2:02 | Vacancy calculator | Scroll to vacancy section in share dialog or pitch. "Vacancy math rides along so the pitch is economic, not just trendy." |
| 2:02-2:12 | Close share | Close dialog; return to report. |
| 2:12-2:22 | Add to pipeline | Click **Add to pipeline**; hold on **Added to pipeline** state. "Track outreach without leaving the report." |
| 2:22-2:38 | Pipeline board | Navigate to `/pipeline`; show card in a column. "Stages from first pitch to signed lease." |
| 2:38-2:52 | Methodology | Open **How it works** / methodology; hold on pipeline steps and eval table footnote. "Methodology and CIs are on the site, not buried in a slide deck." |
| 2:52-3:00 | Landing outro | Back to landing or logo card. "LeaseUp: honest Qloo lift, open data, broker-ready pitches. Try the Wicker demo." |

**Total:** 3:00 (180 s). Pad any segment by up to 2 s if transitions need breathing room; keep total at or under 3:00 for Devpost limits.

### B-roll inserts (optional, if under time)

- Brand reverse heatmap glance (3 s max).
- Export CSV on pipeline (2 s).

### Do not say on camera

- That raw Qloo affinity beats chain size on mean top-10 presence (it does not: 0.54 vs 0.76).
- That heatmap drives ranking (eval showed no lift).
- Unverified lease-close rates (eval target is store presence, not signed deals).

---

## Devpost gallery checklist

- [ ] 5-6 PNGs at 1600x1000 in `docs/media/devpost/` via `pnpm capture:devpost:local`
- [ ] `walkthrough.mp4` / `walkthrough.webm` from local test capture after redesign approval
- [ ] Link to live demo URL when allowed; otherwise note "demo video + screenshots from local stack matching production commit `<sha>`"
