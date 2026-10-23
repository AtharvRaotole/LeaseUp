# KV operations per `/api/analyze` (audit)

Counts are **KV namespace** `get` / `put` only (Cloudflare free tier: 100k reads / 1k writes per day). Ephemeral data now uses the **Workers Cache API** (`caches.default`), which does not count against KV limits.

## Before (production worker, pre-PR)

Typical **cold** live analyze (suite stripped, ~10 km radius, ~10 prospects with trade-area taste):

| Step | KV gets | KV puts | Notes |
| --- | ---: | ---: | --- |
| Nominatim geocode candidates | 1 | 1 | Per unique address key |
| Nominatim reverse (optional) | 0–1 | 0–1 | Neighborhood label |
| Qloo brand insights | 1 | 1 | Merged insights blob |
| Qloo explainability (per prospect) | up to 20 | up to 20 | tag + audience per prospect |
| Qloo heatmap / grid (backtest path) | 0–2 | 0–2 | When heatmap used |
| ATP tile index + tiles | 1 + ~7 | 1 + ~7 | `tiles:brands` + geohash3 tiles |
| OSM snapshot tiles | 1 + ~7 | 1 + ~7 | `osm-tiles:*` |
| OSM verify result cache | 1 | 1 | `verify:result:v1:*` |
| Live Overpass lock + query | 1–2 | 1–2 | Background warmup |
| **Typical cold total** | **~25–55** | **~25–55** | Scales with prospects and tiles |

**Warm** repeat (same address, caches hit): similar **read** volume, often **10–30+ puts** still possible when verify/tile keys vary slightly.

Read-only routes previously made it worse:

| Route | Before |
| --- | --- |
| `GET /api/share/report` | Full `analyze()` (same as POST) |
| `GET /api/og/report.png` (miss) | Full `analyze()` + KV PNG cache |

## After (this PR)

| Path | KV gets | KV puts |
| --- | ---: | ---: |
| `POST /api/analyze` (cold or warm) | **0** | **0** |
| `GET /api/analyze/:runId` | **0** | **0** (D1 only) |
| `GET /api/share/report` | **0** | **0** (meta from query params) |
| `GET /api/og/report.png` | **0** | **0** (Cache API for PNG; stub card, no analyze) |

Ephemeral caches (Qloo, geocode, Overpass, tiles, verify, compare flip, OG PNG) use **Cache API** with `put*IfChanged` to avoid rewriting identical bodies.

**Persistent KV** (wrapped in `PersistentKv`, skip unchanged puts, log and continue on error):

- Reserved for durable share/portfolio/prospecting payloads when stored in KV in the future; pitch/portfolio/prospecting jobs today use **D1**.

## Measured on demo fixture (CI)

`apps/worker/src/__tests__/kv-analyze-ops.test.ts` runs in **CI / Test** (`pnpm --filter @leaseup/worker test`). It calls `AnalysisService.analyze` twice on `DEMO_CHIP_ADDRESSES.wicker` with a counting `CACHE` mock:

| Call | KV gets | KV puts |
| --- | ---: | ---: |
| Cold | **0** | **0** |
| Warm (repeat) | **0** | **0** |

Legacy expectation (pre-#45): cold ~25–55 gets and puts per call (see table above).

## Where KV is still written

| Surface | Storage today | KV gets/puts |
| --- | --- | ---: |
| `POST /api/analyze` | Cache API + D1 run row | **0 / 0** |
| `POST /api/pitch` (share link) | D1 `pitch_packs` | **0 / 0** (`kv-persistent-routes.test.ts`) |
| Portfolio / prospecting jobs | D1 | **0 / 0** |
| `GET /api/share/report`, OG PNG | Cache API or static meta | **0 / 0** |

`PersistentKv` is wired for future durable KV use (skip unchanged, log on error); no production route calls it yet.
