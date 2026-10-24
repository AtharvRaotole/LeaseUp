# Co-tenancy pairing (Qloo)

One `/v2/insights` call per pitched brand: `filter.results.entities` = pitched brand,
`signal.interests.entities` = nearest OSM incumbents (up to 8 in analyze today), `feature.explainability=true`.
The pairing uses `query.explainability["signal.interests.entities"]` on the pitched brand row
(per-incumbent share). `query.affinity` is flat (about 0.9 for every brand) and is not used.
Lines are shown only when an incumbent clearly stands out (see `apps/worker/src/lib/co-tenancy-pairing.ts`).

When no co-tenancy line qualifies, the pitch row may show `Shoppers here also favor {audience}` only when
that audience comes from verified brand x location overlap in `whyBrandTaste` (live-audiences recordings).

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

Regenerate the incumbent tables below from the committed OSM snapshot (10 km, distance order):

```bash
node scripts/list-co-tenancy-incumbents.mjs
```

## Recording spec: nearest OSM incumbents (10 km)

Record co-tenancy insights for **each pitched brand on the report** against the incumbent set the
worker will request. Analyze passes the **8 nearest** distinct incumbent entity ids (excluding the
pitched brand) via `incumbentEntityIdsForCoAffinity`. The tables list **15** nearest tenants so you
can extend fixtures or spot-check ordering; use at least the first **8** for each chip unless you
are deliberately widening the pool in code.

All entity ids are Qloo brand ids from the OSM snapshot catalog (`apps/worker/public/osm-tiles/`).

### 350 Bleecker St, New York, NY 10014

Pin: 40.73352, -74.00271 (West Village). Not a demo Qloo chip today; record when Bleecker analyze
is wired to the same incumbent list.

| # | Incumbent | Entity id | Distance |
|---|-----------|-----------|----------|
| 1 | Starbucks | `B13C02E3-BA3C-4B39-85B4-ACF12FEBC892` | 0.03 km |
| 2 | Five Guys | `6D548BAE-A999-44A2-8FEB-5E92E9AE158F` | 0.16 km |
| 3 | Chipotle Mexican Grill | `4CFF9589-5168-48BD-88F0-D0826466F37D` | 0.24 km |
| 4 | Popeyes | `BBF22D8D-166F-44A8-8694-3F6FF4F745AB` | 0.31 km |
| 5 | AT&T | `0E011D42-90B2-496E-B285-4EB2181EB0A9` | 0.52 km |
| 6 | McDonald's | `8417D6F9-C8C7-40AD-BE49-0987A4663228` | 0.56 km |
| 7 | Panera Bread | `CCD54989-DFC4-4443-A378-72D6693B4903` | 0.84 km |
| 8 | Blue Bottle Coffee | `22B1BC87-CDFE-4340-86F8-8E0E6E1E6A7D` | 0.87 km |
| 9 | Apple | `D5B78065-6DBB-4DDB-80DF-6495B9B1006B` | 0.88 km |
| 10 | Planet Fitness | `CF8FDD0C-2601-4F42-95A7-05B5DAD71529` | 0.88 km |
| 11 | Mattress Firm | `3CCF14AE-D5B0-4CB8-A8BA-5597827E8130` | 0.91 km |
| 12 | Burlington | `91491729-2989-44C6-82F1-E8EB25B9FA42` | 0.95 km |
| 13 | Raising Cane's | `20E485DE-70A9-4635-AF36-F1305B60827D` | 1.01 km |
| 14 | Adidas | `FCEA7CA1-1D40-4680-B337-E74594D9BCF1` | 1.03 km |
| 15 | Best Buy | `BEF4E5D5-245C-49D5-8D20-7C8A1B3C80F5` | 1.04 km |

### Wicker Park chip (`1560 N Milwaukee Ave` / legacy `1574 N Milwaukee Ave`)

Pin: 41.9099418, -87.6772824

| # | Incumbent | Entity id | Distance |
|---|-----------|-----------|----------|
| 1 | Abercrombie & Fitch | `5D03112C-CD2A-41C3-9ED0-D72EED8BB373` | 0.12 km |
| 2 | AT&T | `0E011D42-90B2-496E-B285-4EB2181EB0A9` | 0.13 km |
| 3 | Mattress Firm | `3CCF14AE-D5B0-4CB8-A8BA-5597827E8130` | 0.37 km |
| 4 | Chipotle Mexican Grill | `4CFF9589-5168-48BD-88F0-D0826466F37D` | 0.38 km |
| 5 | Aldi | `88483819-91A9-45BE-8110-0D6CD0C9B35D` | 0.54 km |
| 6 | Jimmy John's | `1C26370D-CCAB-4014-9D61-F17703B7C25C` | 0.75 km |
| 7 | Baskin-Robbins | `706BC87D-2A45-474B-AD67-210677434F88` | 0.81 km |
| 8 | Anytime Fitness | `8AB653CD-7984-4263-B4B0-F3C4C02519DC` | 0.88 km |
| 9 | Starbucks | `B13C02E3-BA3C-4B39-85B4-ACF12FEBC892` | 0.88 km |
| 10 | Chick-fil-A | `B4606C6E-9133-4FB8-88FD-CF1D37F5AAC7` | 0.95 km |
| 11 | Target | `BFC8D7B1-BDD2-478E-85AB-F4FEE868177A` | 0.95 km |
| 12 | Popeyes | `BBF22D8D-166F-44A8-8694-3F6FF4F745AB` | 1.12 km |
| 13 | McDonald's | `8417D6F9-C8C7-40AD-BE49-0987A4663228` | 1.13 km |
| 14 | Best Buy | `BEF4E5D5-245C-49D5-8D20-7C8A1B3C80F5` | 1.19 km |
| 15 | Kohl's | `945C90D2-07D7-43B3-98FE-C437DE7A6D16` | 1.25 km |

Pitched brands for the wicker demo report come from the worker top-10 at this address (see
`scripts/record-co-tenancy-fixture.mjs`, which calls analyze on the local worker).

### Boulder chip (`1300 Pearl St` / legacy `1125 Pearl St`)

Pin: 40.0179234, -105.2805434

| # | Incumbent | Entity id | Distance |
|---|-----------|-----------|----------|
| 1 | Athleta | `DFFF4470-F663-4742-A503-4FD0CB152498` | 0.01 km |
| 2 | Chipotle Mexican Grill | `4CFF9589-5168-48BD-88F0-D0826466F37D` | 1.24 km |
| 3 | Starbucks | `B13C02E3-BA3C-4B39-85B4-ACF12FEBC892` | 1.28 km |
| 4 | Panda Express | `0E67ECB0-C65D-4221-A0A2-2E5CD84B9322` | 1.49 km |
| 5 | Sally Beauty | `8D0B9212-0D30-4D8C-9134-06B7F232C642` | 1.60 km |
| 6 | Petco | `0025C006-CD75-479F-B42E-DFD4D16A6DE5` | 1.67 km |
| 7 | REI | `205AF33F-118E-4C49-9721-6BDBAF981DA0` | 1.79 km |
| 8 | Mattress Firm | `3CCF14AE-D5B0-4CB8-A8BA-5597827E8130` | 1.85 km |
| 9 | McDonald's | `8417D6F9-C8C7-40AD-BE49-0987A4663228` | 1.93 km |
| 10 | Burger King | `74D13B62-2C51-4D99-804F-3D338F7B0406` | 1.95 km |
| 11 | 7-Eleven | `0B47F4FC-A267-4E07-85F4-F64511835C03` | 1.98 km |
| 12 | Crumbl | `7C4CC0B9-1C3C-4C5C-A732-5991046EBB03` | 2.03 km |
| 13 | AT&T | `0E011D42-90B2-496E-B285-4EB2181EB0A9` | 2.04 km |
| 14 | Five Guys | `6D548BAE-A999-44A2-8FEB-5E92E9AE158F` | 2.04 km |
| 15 | Panera Bread | `CCD54989-DFC4-4443-A378-72D6693B4903` | 2.06 km |

### Sevierville chip (`125 Collier Dr`)

Pin: 35.8365438, -83.5589482

| # | Incumbent | Entity id | Distance |
|---|-----------|-----------|----------|
| 1 | Applebee's | `8227A628-2D77-4EB3-8F1A-2C4238997412` | 0.41 km |
| 2 | Buffalo Wild Wings | `D9E4D872-7E4D-4E5A-B94F-FFD25B7D98C2` | 0.81 km |
| 3 | Banana Republic | `BEE83976-354E-4991-95BB-C32595C9C96D` | 1.00 km |
| 4 | Brooks Brothers | `5318FE99-3ADB-4E62-BFA5-DED63001E3DD` | 1.03 km |
| 5 | Ann Taylor | `D2AB8018-EDD0-45A4-908F-A93658E5223E` | 1.05 km |
| 6 | Bath & Body Works | `54617D9D-5EC7-45E0-8B7F-360DADB0FE7E` | 1.14 km |
| 7 | Panda Express | `0E67ECB0-C65D-4221-A0A2-2E5CD84B9322` | 1.16 km |
| 8 | Chick-fil-A | `B4606C6E-9133-4FB8-88FD-CF1D37F5AAC7` | 1.17 km |
| 9 | Baskin-Robbins | `706BC87D-2A45-474B-AD67-210677434F88` | 1.18 km |
| 10 | Arby's | `CE2A2DDD-3F1D-49A4-8DDF-5665365587CE` | 1.31 km |
| 11 | Adidas | `FCEA7CA1-1D40-4680-B337-E74594D9BCF1` | 1.33 km |
| 12 | Starbucks | `B13C02E3-BA3C-4B39-85B4-ACF12FEBC892` | 1.35 km |
| 13 | Chipotle Mexican Grill | `4CFF9589-5168-48BD-88F0-D0826466F37D` | 1.43 km |
| 14 | McDonald's | `8417D6F9-C8C7-40AD-BE49-0987A4663228` | 1.68 km |
| 15 | AT&T | `0E011D42-90B2-496E-B285-4EB2181EB0A9` | 2.59 km |
