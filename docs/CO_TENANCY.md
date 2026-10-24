# Co-tenancy pairing (Qloo)

One `/v2/insights` call per pitched brand: `filter.results.entities` = pitched brand,
`signal.interests.entities` = nearest OSM incumbents (up to 8), `feature.explainability=true`.
The pairing uses `query.explainability["signal.interests.entities"]` on the pitched brand row
(per-incumbent share). `query.affinity` is flat (about 0.9 for every brand) and is not used.
Lines are shown only when an incumbent clearly stands out (see `apps/worker/src/lib/co-tenancy-pairing.ts`).

Record with a live API key (no mocks). Pitches and incumbents come from the local demo worker so
fixture keys match the report:

```bash
(cd apps/worker && wrangler dev --local --port 8787)
QLOO_API_KEY=... node scripts/record-co-tenancy-fixture.mjs wicker boulder sevierville
```

Demo shares live in `apps/worker/public/co-tenancy/recorded.json`, served through the worker
`ASSETS` binding so they stay out of the worker bundle. Packed per chip as `{ ids, entries }`:
`ids` lists each incumbent entity id once; each entry (keyed by
`${pitchEntityId}:${sha256(sorted incumbents)}`) holds `s`, `[index into ids, share]` pairs
with shares rounded to 4 places. Live mode caches the parsed shares per site and brand.

Probe a single call first:

```bash
QLOO_API_KEY=... node scripts/probe-qloo-co-affinity.mjs
```
