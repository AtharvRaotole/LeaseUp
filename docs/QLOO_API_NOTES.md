# Qloo hackathon API notes (LeaseUp)

Base URL: `https://hackathon.api.qloo.com`

Auth: header `X-Api-Key: <secret>` (never commit keys).

## Probe (Oct 23, 2026)

Without a key:

```http
GET /v2/insights?filter.type=urn:heatmap&filter.location.query=Chicago%2C%20IL&signal.interests.entities=54617D9D-5EC7-45E0-8B7F-360DADB0FE7E
Accept: application/json
```

Response: `401` `{"error":{"reason":"No API key found in request","message":"Unauthorized","code":401}}`

## Brand heatmap (preferred for reverse mode)

Worker uses `GET /v2/insights` (not `/v2/insights/heatmap`) with:

| Param | Value |
| --- | --- |
| `filter.type` | `urn:heatmap` |
| `filter.location` | WKT `POINT(lon lat)` |
| `filter.location.radius` | meters (integer) |
| `signal.interests.entities` | single brand Qloo entity id |

Example (Chicago metro, 35 km, Bath & Body Works):

```http
GET /v2/insights?filter.type=urn:heatmap&filter.location=POINT(-87.6298%2041.8781)&filter.location.radius=35000&signal.interests.entities=54617D9D-5EC7-45E0-8B7F-360DADB0FE7E
X-Api-Key: <secret>
Accept: application/json
```

Metrics logged as endpoint `/v2/insights/heatmap` in D1.

Cell shape (live): `location.lat`, `location.lon`, `query.affinity`, `query.affinity_rank`.

## Grid fallback (4xx or empty heatmap)

For each grid point inside the metro bounding box:

```http
GET /v2/insights?filter.type=urn:entity:brand&filter.results.entities=<brandId>&signal.location=POINT(lon%20lat)&signal.location.radius=2000&take=1&feature.explainability=true
```

`take` must be 1 to 50 (`clampQlooTake`).

## Site analysis (existing)

```http
GET /v2/insights?filter.type=urn:entity:brand&signal.location=POINT(lon%20lat)&signal.location.radius=10000&take=50&feature.explainability=true
```

Brand batches: `filter.results.entities` comma-separated, max 45 ids per request.

## Brand x local audience overlap (Why this brand)

The Why card lists up to three Qloo **audiences** that are characteristic of the brand AND rank high
near the pin. Two separate calls, so the overlap is checked rather than assumed:

```http
GET /v2/insights?filter.type=urn:audience&signal.interests.entities=<brandId>&take=50        # brand-only
GET /v2/insights?filter.type=urn:audience&signal.location=POINT(lon%20lat)&signal.location.radius=10000&take=50   # location-only
X-Api-Key: <secret>
```

An audience is shown only if it is in the brand's own top 12 with affinity >= 0.52 (Qloo reports 0.5 for
"no signal") and also in the location's top 30 (`computeBrandLocalAudienceOverlap` in
`packages/fixtures/src/qloo-brand-taste-overlap.ts`). The brand's affinity must also beat the mean affinity
of the same audience across the other recorded live brands by 0.03 (`audiencePanelBaseline`), which drops
audiences Qloo ranks high for nearly every retailer (Finance Professional for Ulta, for example). If nothing
passes, the section is omitted.

Measured Oct 2026 on the hackathon host (why the earlier method was dropped):

- `filter.type=urn:tag` with brand + location signals returns generic cross-domain tags (American restaurants,
  country music, Tourist attraction) with affinity ~0.99 for every row, so the top tags are not brand-specific.
- `feature.explainability=true` returns no explainability block for `urn:tag` / `urn:audience`, and there is
  no `query.affinity_rank` on these responses.
- A single brand + location call blends both signals; it cannot tell you which audiences the brand and the
  area actually share.

Record demo chip fixtures (live only; no mock mode; key via env, never stored):

```bash
QLOO_API_KEY=... node scripts/record-brand-explainability-fixture.mjs                # all demo chips + pitched brands
QLOO_API_KEY=... node scripts/record-brand-explainability-fixture.mjs boulder_ulta wicker_tjmaxx
```

Writes `packages/fixtures/src/brand-explainability/{brand-audiences,local-audiences}/*.json` (normalized rows)
plus untouched API bodies under `brand-explainability/raw/`. Then run
`node scripts/compact-brand-explainability.mjs`, which packs the normalized rows verbatim into
`brand-explainability/live-audiences.compact.json`, the only file the app imports, so the worker bundle stays
under the `check-worker-bundle` size cap.

## Recording fixtures

```bash
QLOO_API_KEY=... node scripts/record-brand-reverse-fixture.mjs
```

Writes `packages/fixtures/src/brand-reverse-chicago.ts` from a live heatmap response.
