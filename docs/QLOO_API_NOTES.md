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

## Trade-area tags & audiences (Why this brand)

For a brand entity and trade-area pin, Qloo returns locally over-indexing **tags** and **audiences** when you anchor taste on the brand and location:

```http
GET /v2/insights?filter.type=urn:tag&signal.location=POINT(-105.2805434%2040.0179234)&signal.location.radius=10000&signal.interests.entities=205AF33F-118E-4C49-9721-6BDBAF981DA0&take=25&feature.explainability=true
X-Api-Key: <secret>
```

Swap `filter.type` to `urn:audience` for audience lift. Responses use `results.tags` / `results.audiences` (or `results.entities`) with `query.affinity` and `query.affinity_rank`.

Record demo chip fixtures (no API key stored):

```bash
QLOO_API_KEY=... node scripts/record-brand-explainability-fixture.mjs boulder wicker sevierville
```

Writes `packages/fixtures/src/brand-explainability/<chip>-<brandEntityId>.json`. For CI without a key, `LEASEUP_EXPLAINABILITY_MOCK=1` replays `packages/fixtures/src/brand-explainability/captures/*.json` (regenerate captures with a live key before shipping).

## Recording fixtures

```bash
QLOO_API_KEY=... node scripts/record-brand-reverse-fixture.mjs
```

Writes `packages/fixtures/src/brand-reverse-chicago.ts` from a live heatmap response.
