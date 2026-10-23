# LeaseUp

**Find the tenants your retail space is missing.**

LeaseUp ranks brands for a storefront using Qloo taste affinity, then checks the list against real chain locations (All The Places) and OpenStreetMap before you pitch. Built for the [Qloo Agentic Hackathon 2026](https://qloo.devpost.com/).

**Live demo:** [https://leaseup-59m.pages.dev](https://leaseup-59m.pages.dev)

![LeaseUp landing (light, 1440px)](docs/screenshots/landing-light-1440.png)

## One-minute demo

1. Open the live site and enter `1574 N Milwaukee Ave, Chicago, IL 60622` (or click **Wicker Park**).
2. Leave radius at **10 km** and run **Analyze**.
3. Scan **Brands to pitch** for high-fit chains with no nearby store.
4. Open **Compare** to flip Wicker vs Sevierville on recorded fixtures.
5. Click **Draft outreach** on a prospect to see gpt-4o-mini copy (on demand only).

Report UI (demo chip):

![Report (light, 1440px)](docs/screenshots/report-light-1440.png)

Mobile landing:

![LeaseUp landing (light, 390px)](docs/screenshots/landing-light-390.png)

## Features

| Feature | What you get |
| --- | --- |
| Taste-ranked prospects | Qloo `/v2/insights` at your pin (or recorded fixtures in demo) |
| Backtest strip | How many top-10 brands already have a store in radius |
| Map + verification | ATP locations and OSM checks on demo recordings |
| Compare mode | Side-by-side neighborhoods from saved Qloo JSON |
| Outreach drafts | OpenAI `gpt-4o-mini` when you click, not by default |
| **Brand sites** (`/brand`) | Qloo heatmap by chain and metro, ATP store overlay, ranked white-space cells |
| **Portfolio** (`/portfolio`) | Batch up to 10 addresses, confirm geocodes, sequential analyses, shareable CSV |
| **Pitch pack** (`/pitch/:id`) | Shareable read-only snapshot from a site report, map image, top 5 prospects, print/PDF |

Brand reverse (recorded Chicago heatmap, light 1440px):

![Brand reverse mode](docs/screenshots/features/brand-reverse-light-1440.png)

Portfolio batch (light 390px):

![Portfolio mode](docs/screenshots/features/portfolio-light-390.png)

Pitch pack (light 1440px):

![Pitch pack](docs/screenshots/features/pitch-pack-light-1440.png)

## Architecture

```mermaid
flowchart TB
  subgraph client [Browser]
    Web[React + Vite]
    Map[MapLibre GL]
  end
  subgraph cf [Cloudflare]
    Pages[Pages]
    Worker[Worker API]
    KV[(KV)]
    D1[(D1)]
  end
  subgraph data [Providers]
    Qloo[Qloo /v2/insights]
    ATP[All The Places CC0]
    OSM[OSM snapshot tiles]
    OAI[OpenAI gpt-4o-mini]
  end
  Web --> Pages
  Web --> Worker
  Map --> Worker
  Worker --> KV
  Worker --> D1
  Worker --> Qloo
  Worker --> ATP
  Worker --> OSM
  Worker --> OAI
```

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## How we use Qloo

Live requests go to `https://hackathon.api.qloo.com` (override with `QLOO_BASE_URL`):

- **`GET /v2/insights`** with `filter.type=urn:entity:brand`, geocoded `signal.location` (WKT point) and `signal.location.radius` in meters, `take` up to 50, optional `filter.results.entities` (batched at 45 IDs) and `filter.tags`, plus `feature.explainability=true`.
- **Heatmap** uses the heatmap variant on the same API when cells are returned (live only; demo does not fabricate heatmaps).

Demo mode serves recorded responses for the three chip addresses only; other addresses require `APP_MODE=live` and `QLOO_API_KEY`.

## Accuracy and honesty

- **Backtest:** Among brands Qloo returns that we also track in All The Places, we count how many of the top 10 already have a store within your radius. Demo hit rates on the homepage are computed from fixtures (`packages/fixtures`), not hand-edited.
- **Verification labels** on the report reflect ATP matches and OSM snapshot checks where recorded; single-source rows are marked accordingly.
- **Limits:** We track on the order of 200 major chains in the embedded ATP snapshot, not every retailer. Cross-batch Qloo affinity ordering is an assumption when more than 45 brand IDs are requested. Heatmaps appear only when Qloo returns cells in live mode.

Regenerate the metrics table from code:

```bash
node scripts/generate-readme-metrics.mjs
```

## Local setup

Requirements: Node 22+, pnpm 9+.

```bash
pnpm install
pnpm dev          # web + worker via turbo
# or
pnpm --filter @leaseup/web dev
pnpm --filter @leaseup/worker dev
```

Copy `apps/worker/.dev.vars.example` to `.dev.vars` for live Qloo and OpenAI keys. Default `APP_MODE=demo` works without keys for the three demo chips.

Production build:

```bash
pnpm verify:ci
```

## Tests

```bash
pnpm test
```

Web UI copy is checked for em/en dashes. Fixture backtests and demo chip routing have focused tests under `apps/web/src/__tests__/`.

## Screenshots (for reviewers)

Captured with `node scripts/story-screenshots.mjs` after `pnpm --filter @leaseup/web build && pnpm --filter @leaseup/web preview`. Metadata: `docs/screenshots/capture-meta.json` (commit SHA and base branch SHA at capture time).

## License

MIT. See [LICENSE](LICENSE).

## Attribution

- [Qloo](https://qloo.com/) Taste AI (hackathon API)
- [All The Places](https://www.alltheplaces.xyz/) store locations (CC0)
- [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL)
- Map tiles via [MapLibre GL](https://maplibre.org/)
