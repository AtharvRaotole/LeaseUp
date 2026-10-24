# Co-tenancy Qloo fixtures (demo mode)

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

Only the explainability shares are stored, packed per chip as `{ ids, entries }`: `ids` lists each incumbent entity id once and every entry (keyed by `${pitchEntityId}:${sha256(incumbents)}`) holds the pitch name `n` and `[index, score]` pairs `s` with scores rounded to 4 places. `coTenancyRecordedRaw` expands an entry back into the compact insights shape the worker parses.

Probe a single call first:

```bash
QLOO_API_KEY=... node scripts/probe-qloo-co-affinity.mjs
```
