# LeaseUp (Qloo Agentic Hackathon 2026)

## The problem

Retail brokers and landlords pitch chains that already operate down the block. Taste-aware ranking should surface brands that fit the trade area but are not yet in the radius, with evidence brokers can show a landlord in one sitting.

## What LeaseUp does

LeaseUp turns a storefront address into a ranked pitch list:

1. Geocode the pin and set a search radius (2, 5, or 10 km).
2. Pull Qloo brand insights for the trade area (`/v2/insights`, up to 50 brands, batched across 227 tracked chains).
3. Cross-check each prospect against **All The Places** store locations (CC0 snapshot, Oct 2026).
4. On demo chips, add **OpenStreetMap** snapshot verification for a second source.
5. Backtest the ranking: how many of the top 10 returned brands already have a store in radius (computed in `packages/fixtures`, not hand-edited).
6. Draft outreach on demand via **gpt-4o-mini** when the broker clicks (never auto-sent).

**Live demo:** https://leaseup-59m.pages.dev

**Product walkthrough (recorded on production demo):** [docs/media/walkthrough.mp4](./media/walkthrough.mp4) and [walkthrough.webm](./media/walkthrough.webm). Re-record with `pnpm record:demo`.

## How we use Qloo

- **Site reports:** `GET /v2/insights` with `filter.type=urn:entity:brand`, WKT `signal.location`, radius in meters, optional `filter.results.entities` (45 IDs per batch), `feature.explainability=true`.
- **Brand sites (`/brand`):** heatmap cells when Qloo returns them in live mode; demo uses recorded Chicago/Denver/Austin fixtures.
- **Proof toggle on reports:** same candidate pool ranked by logistic taste blend vs national chain-size baseline (ATP store counts), with side-by-side backtest counts.

Demo mode serves **recorded** Qloo JSON for three US addresses (Wicker Park, Boulder Pearl St, Sevierville). Live mode requires `QLOO_API_KEY`.

## Recorded evaluation (40 US addresses, live Qloo API)

Preregistered adaptive-radius study on `/methodology` (see `packages/fixtures/src/eval/results_adaptive.json`):

| Claim | Value |
| --- | --- |
| Same-size tier AUC (Qloo within chain-size tier) | **0.67** [0.65, 0.69] |
| Mean top-10 presence, taste-aware logistic blend | **82%** |
| Mean top-10 presence, chain size alone | **76%** |
| Raw Qloo affinity order (mean top-10) | **54%** (does **not** beat chain size) |
| Mid-size chain tier (Q3) P@5, Qloo vs chain | **53%** vs **23%** |

**Caveat:** Qloo taste may partly reflect brands that already operate nearby; read lift alongside store absence checks on the pitch list. Never claim that raw Qloo beats national chain size on mean top-10 presence.

Demo chips (Wicker, Boulder, Sevierville) use recorded fixtures for fast, reproducible judge demos; headline proof lines on those cards match their rows in the 40-site table.

## How we built it

- **Frontend:** React, Vite, MapLibre GL, TanStack Query, deployed on Cloudflare Pages.
- **API:** Cloudflare Worker (Hono), KV cache (success responses only), D1 for portfolio, pipeline, and metrics.
- **Data:** Embedded ATP snapshot (~227 chains), OSM snapshot tiles for demo chips, Qloo recordings in `@leaseup/fixtures`.
- **Quality:** Playwright e2e (features, a11y, CSP + map smoke with production `_headers`), Lighthouse CI on preview, worker bundle guard + 20-call analyze smoke, axe on key routes.

## Challenges

- **Honest evaluation:** Raw Qloo order underperforms chain size on mean P@10; the product uses a fitted logistic blend and shows chain-size baselines beside taste rankings.
- **CSP + split deploy:** Pages static host and Worker API need aligned `connect-src`; we regression-test CSP on the Wicker report with MapLibre tiles.
- **Worker CPU:** Strict eval and backtests are precomputed or cached on demo chips so `/api/analyze` stays under Cloudflare CPU limits.

## What's next

- Expand live-address coverage beyond the preregistered 40-site panel.
- Expand ATP panel and OSM verification beyond demo chips.
- Deeper portfolio and pipeline analytics tied to Qloo affinity shifts over time.

## Try it in 60 seconds

1. Open https://leaseup-59m.pages.dev
2. Click **Wicker Park** or paste `1574 N Milwaukee Ave, Chicago, IL 60622`
3. Run **Analyze**, scan **Brands to pitch**, toggle **Without taste** on the proof strip
4. Open **Brand sites** for heatmap mode or **Pipeline** to track outreach stages
