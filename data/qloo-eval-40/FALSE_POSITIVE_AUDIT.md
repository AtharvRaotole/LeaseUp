# False-positive audit: missing-brand prospects

Generated: 2026-10-24T04:36:21.675Z

Offline audit of **top-10 “who’s missing” prospects** per site. A false positive is a prospect shown as absent while **any** repo store source (ATP expanded, worker geotiles, OSM snapshot tiles, supplements, or eval `ground_truth.json` counts) has a location within the **adaptive absence radius** used for pitching (same as rankings presence).

## Summary counts

| Metric | Before | After |
|--------|--------|-------|
| Sites audited | 13 | 13 |
| Prospect rows (top-10 per site) | 118 | 118 |
| **False positives** (store present, still pitched) | **39** | **0** |
| OSM-only presence (would have slipped without snapshot verify) | 0 | — |

**Before** row replays analyze with `verifyFromOsmSnapshot` forced to never emit `conflict - likely present` (OSM in-radius stores could be pitched as missing). **After** is current `cursor/leaseup-v1-c429` with geotile catalog + snapshot conflict filtering.

### Before baseline cases (fixed by snapshot verify)

- Wicker Park demo chip — Crumbl (ATP — km, OSM 2.96 km)
- Wicker Park demo chip — American Eagle Outfitters (ATP — km, OSM 1.92 km)
- Boulder demo chip — Crumbl (ATP — km, OSM 1.86 km)
- Sevierville demo chip — TJ Maxx (ATP — km, OSM — km)
- Sevierville demo chip — Marshalls (ATP — km, OSM — km)
- Lakeview Chicago — Crumbl (ATP — km, OSM 0.67 km)
- Naperville IL — Ulta (ATP — km, OSM — km)
- Naperville IL — Michaels (ATP — km, OSM — km)
- Naperville IL — Marshalls (ATP — km, OSM — km)
- Naperville IL — Old Navy (ATP — km, OSM — km)
- Naperville IL — Crumbl (ATP — km, OSM — km)
- Wellesley MA — Ulta (ATP — km, OSM — km)
- Wellesley MA — TJ Maxx (ATP — km, OSM — km)
- Wellesley MA — Michaels (ATP — km, OSM — km)
- Wellesley MA — Marshalls (ATP — km, OSM — km)
- Wellesley MA — Old Navy (ATP — km, OSM — km)
- Wellesley MA — HomeGoods (ATP — km, OSM — km)
- Wellesley MA — Victoria's Secret (ATP — km, OSM — km)
- Wellesley MA — J.Crew (ATP — km, OSM — km)
- Wellesley MA — American Eagle Outfitters (ATP — km, OSM — km)
- Wellesley MA — Trader Joe's (ATP — km, OSM — km)
- Hutchinson KS — Ulta (ATP — km, OSM — km)
- Hutchinson KS — TJ Maxx (ATP — km, OSM — km)
- Hutchinson KS — Hobby Lobby (ATP — km, OSM — km)
- Hutchinson KS — Kohl's (ATP — km, OSM — km)
- Sedalia MO — TJ Maxx (ATP — km, OSM — km)
- Sedalia MO — Hobby Lobby (ATP — km, OSM — km)
- Sedalia MO — Kohl's (ATP — km, OSM — km)
- Ann Arbor MI — Ulta (ATP — km, OSM — km)
- Ann Arbor MI — TJ Maxx (ATP — km, OSM — km)
- Ann Arbor MI — Orangetheory Fitness (ATP — km, OSM — km)
- Ann Arbor MI — Kohl's (ATP — km, OSM — km)
- Ann Arbor MI — Old Navy (ATP — km, OSM — km)
- Ann Arbor MI — HomeGoods (ATP — km, OSM — km)
- Ann Arbor MI — Crumbl (ATP — km, OSM — km)
- Frisco TX strip — Kohl's (ATP — km, OSM — km)
- Branson MO — Old Navy (ATP — km, OSM — km)
- Branson MO — Hobby Lobby (ATP — km, OSM — km)
- Branson MO — American Eagle Outfitters (ATP — km, OSM — km)

### Sites

| Site | Category | Radius km | Prospects | FP after |
|------|----------|-----------|-----------|----------|
| Wicker Park demo chip | dense_urban | 10 | 8 | 0 |
| Boulder demo chip | college_town | 10 | 9 | 0 |
| Sevierville demo chip | tourist | 10 | 10 | 0 |
| Lakeview Chicago | dense_urban | 1.5 | 9 | 0 |
| Williamsburg Brooklyn | dense_urban | 1.5 | 10 | 0 |
| Naperville IL | affluent_suburban | 5 | 7 | 0 |
| Wellesley MA | affluent_suburban | 15 | 9 | 0 |
| Hutchinson KS | small_town | 15 | 9 | 0 |
| Sedalia MO | small_town | 5 | 10 | 0 |
| Ann Arbor MI | college_town | 5 | 9 | 0 |
| Frisco TX strip | sunbelt_growth | 5 | 9 | 0 |
| Gilbert AZ | sunbelt_growth | 5 | 10 | 0 |
| Branson MO | tourist | 5 | 9 | 0 |

## Per-site top-10

### Wicker Park demo chip

Address: `1560 N Milwaukee Ave, Chicago, IL 60622` (41.90970, -87.67683), radius **10 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | TJ Maxx | unverified (1 source) | — | — | — | no |
| 2 | Victoria's Secret | unverified (1 source) | — | — | — | no |
| 3 | J.Crew | unverified (1 source) | — | — | — | no |
| 4 | H&M | unverified (1 source) | — | — | — | no |
| 5 | Vans | unverified (1 source) | — | — | — | no |
| 6 | Express | unverified (1 source) | — | — | — | no |
| 7 | Aerie | unverified (1 source) | — | — | — | no |
| 8 | Coach | unverified (1 source) | — | — | — | no |

### Boulder demo chip

Address: `1300 Pearl St, Boulder, CO 80302` (40.01802, -105.27846), radius **10 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Ulta | unverified (1 source) | — | — | — | no |
| 2 | TJ Maxx | unverified (1 source) | — | — | — | no |
| 3 | Old Navy | unverified (1 source) | — | — | — | no |
| 4 | Hobby Lobby | unverified (1 source) | — | — | — | no |
| 5 | Victoria's Secret | unverified (1 source) | — | — | — | no |
| 6 | American Eagle Outfitters | verified (2 sources) | — | — | — | no |
| 7 | H&M | unverified (1 source) | — | — | — | no |
| 8 | Vans | unverified (1 source) | — | — | — | no |
| 9 | Express | unverified (1 source) | — | — | — | no |

### Sevierville demo chip

Address: `125 Collier Dr, Sevierville, TN 37862` (35.83236, -83.56938), radius **10 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | TJ Maxx | unverified (1 source) | — | — | — | yes |
| 2 | Michaels | verified (2 sources) | — | — | — | no |
| 3 | Marshalls | unverified (1 source) | — | — | — | yes |
| 4 | Kohl's | verified (2 sources) | — | — | — | no |
| 5 | Hobby Lobby | unverified (1 source) | — | — | — | no |
| 6 | HomeGoods | unverified (1 source) | — | — | — | no |
| 7 | J.Crew | unverified (1 source) | — | — | — | no |
| 8 | Trader Joe's | unverified (1 source) | — | — | — | no |
| 9 | Sephora | unverified (1 source) | — | — | — | no |
| 10 | Whole Foods Market | unverified (1 source) | — | — | — | no |

### Lakeview Chicago

Address: `3400 N Southport Ave, Chicago, IL 60657` (41.94356, -87.66415), radius **1.5 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Ulta | unverified (1 source) | — | — | — | no |
| 2 | TJ Maxx | unverified (1 source) | — | — | — | no |
| 3 | Old Navy | unverified (1 source) | — | — | — | no |
| 4 | Kohl's | verified (2 sources) | — | — | — | no |
| 5 | HomeGoods | unverified (1 source) | — | — | — | no |
| 6 | Victoria's Secret | unverified (1 source) | — | — | — | no |
| 7 | American Eagle Outfitters | verified (2 sources) | — | — | — | no |
| 8 | Foot Locker | unverified (1 source) | — | — | — | no |
| 9 | H&M | unverified (1 source) | — | — | — | no |

### Williamsburg Brooklyn

Address: `250 Bedford Ave, Brooklyn, NY 11249` (40.71587, -73.96005), radius **1.5 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Ulta | unverified (1 source) | — | — | — | no |
| 2 | TJ Maxx | unverified (1 source) | — | — | — | no |
| 3 | Michaels | verified (2 sources) | — | — | — | no |
| 4 | Marshalls | unverified (1 source) | — | — | — | no |
| 5 | Old Navy | unverified (1 source) | — | — | — | no |
| 6 | HomeGoods | unverified (1 source) | — | — | — | no |
| 7 | Victoria's Secret | unverified (1 source) | — | — | — | no |
| 8 | American Eagle Outfitters | verified (2 sources) | — | — | — | no |
| 9 | Foot Locker | unverified (1 source) | — | — | — | no |
| 10 | H&M | unverified (1 source) | — | — | — | no |

### Naperville IL

Address: `100 W Jefferson Ave, Naperville, IL 60540` (41.77289, -88.14972), radius **5 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Ulta | unverified (1 source) | — | — | — | yes |
| 2 | TJ Maxx | unverified (1 source) | — | — | — | no |
| 3 | Marshalls | unverified (1 source) | — | — | — | yes |
| 4 | Old Navy | unverified (1 source) | — | — | — | yes |
| 5 | Hobby Lobby | unverified (1 source) | — | — | — | no |
| 6 | HomeGoods | unverified (1 source) | — | — | — | no |
| 7 | Victoria's Secret | unverified (1 source) | — | — | — | no |

### Wellesley MA

Address: `60 Central St, Wellesley, MA 02482` (42.29596, -71.29798), radius **15 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Ulta | unverified (1 source) | — | — | — | yes |
| 2 | TJ Maxx | unverified (1 source) | — | — | — | yes |
| 3 | Marshalls | unverified (1 source) | — | — | — | yes |
| 4 | Old Navy | unverified (1 source) | — | — | — | yes |
| 5 | HomeGoods | unverified (1 source) | — | — | — | yes |
| 6 | Victoria's Secret | unverified (1 source) | — | — | — | yes |
| 7 | J.Crew | unverified (1 source) | — | — | — | yes |
| 8 | American Eagle Outfitters | verified (2 sources) | — | — | — | yes |
| 9 | Trader Joe's | unverified (1 source) | — | — | — | yes |

### Hutchinson KS

Address: `100 N Main St, Hutchinson, KS 67501` (38.05356, -97.93174), radius **15 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Ulta | unverified (1 source) | — | — | — | yes |
| 2 | QuikTrip | unverified (1 source) | — | — | — | no |
| 3 | TJ Maxx | unverified (1 source) | — | — | — | yes |
| 4 | Michaels | verified (2 sources) | — | — | — | no |
| 5 | Hobby Lobby | unverified (1 source) | — | — | — | yes |
| 6 | Old Navy | verified (2 sources) | — | — | — | no |
| 7 | HomeGoods | unverified (1 source) | — | — | — | no |
| 8 | Crumbl | verified (2 sources) | — | — | — | no |
| 9 | Victoria's Secret | unverified (1 source) | — | — | — | no |

### Sedalia MO

Address: `200 S Ohio Ave, Sedalia, MO 65301` (38.70967, -93.22799), radius **5 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Ulta | unverified (1 source) | — | — | — | no |
| 2 | TJ Maxx | unverified (1 source) | — | — | — | yes |
| 3 | QuikTrip | unverified (1 source) | — | — | — | no |
| 4 | Hobby Lobby | unverified (1 source) | — | — | — | yes |
| 5 | Kohl's | unverified (1 source) | — | — | — | yes |
| 6 | HomeGoods | unverified (1 source) | — | — | — | no |
| 7 | Crumbl | verified (2 sources) | — | — | — | no |
| 8 | Victoria's Secret | unverified (1 source) | — | — | — | no |
| 9 | American Eagle Outfitters | verified (2 sources) | — | — | — | no |
| 10 | Trader Joe's | unverified (1 source) | — | — | — | no |

### Ann Arbor MI

Address: `300 S State St, Ann Arbor, MI 48104` (42.27925, -83.74095), radius **5 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Ulta | unverified (1 source) | — | — | — | yes |
| 2 | TJ Maxx | unverified (1 source) | — | — | — | yes |
| 3 | Michaels | verified (2 sources) | — | — | — | no |
| 4 | Marshalls | unverified (1 source) | — | — | — | no |
| 5 | Orangetheory Fitness | unverified (1 source) | — | — | — | yes |
| 6 | Old Navy | unverified (1 source) | — | — | — | yes |
| 7 | Hobby Lobby | unverified (1 source) | — | — | — | no |
| 8 | HomeGoods | unverified (1 source) | — | — | — | yes |
| 9 | Crumbl | verified (2 sources) | — | — | — | yes |

### Frisco TX strip

Address: `3300 Dallas Pkwy, Frisco, TX 75034` (33.15701, -96.84066), radius **5 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | TJ Maxx | unverified (1 source) | — | — | — | no |
| 2 | Marshalls | unverified (1 source) | — | — | — | no |
| 3 | Old Navy | unverified (1 source) | — | — | — | no |
| 4 | Hobby Lobby | unverified (1 source) | — | — | — | no |
| 5 | HomeGoods | unverified (1 source) | — | — | — | no |
| 6 | Victoria's Secret | unverified (1 source) | — | — | — | no |
| 7 | J.Crew | unverified (1 source) | — | — | — | no |
| 8 | Trader Joe's | unverified (1 source) | — | — | — | no |
| 9 | Foot Locker | unverified (1 source) | — | — | — | no |

### Gilbert AZ

Address: `2218 E Williams Field Rd, Gilbert, AZ 85295` (33.30884, -111.74251), radius **5 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | PetSmart | unverified (1 source) | — | — | — | no |
| 2 | TJ Maxx | unverified (1 source) | — | — | — | no |
| 3 | Michaels | verified (2 sources) | — | — | — | no |
| 4 | Hobby Lobby | unverified (1 source) | — | — | — | no |
| 5 | J.Crew | unverified (1 source) | — | — | — | no |
| 6 | Whole Foods Market | unverified (1 source) | — | — | — | no |
| 7 | H&M | unverified (1 source) | — | — | — | no |
| 8 | Express | unverified (1 source) | — | — | — | no |
| 9 | Krispy Kreme | unverified (1 source) | — | — | — | no |
| 10 | Nike | unverified (1 source) | — | — | — | no |

### Branson MO

Address: `100 Branson Landing Blvd, Branson, MO 65616` (36.64686, -93.21525), radius **5 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | QuikTrip | unverified (1 source) | — | — | — | no |
| 2 | Old Navy | unverified (1 source) | — | — | — | yes |
| 3 | Marshalls | unverified (1 source) | — | — | — | no |
| 4 | Hobby Lobby | unverified (1 source) | — | — | — | yes |
| 5 | HomeGoods | unverified (1 source) | — | — | — | no |
| 6 | Crumbl | verified (2 sources) | — | — | — | no |
| 7 | J.Crew | unverified (1 source) | — | — | — | no |
| 8 | Trader Joe's | unverified (1 source) | — | — | — | no |
| 9 | Sephora | unverified (1 source) | — | — | — | no |

## Fixtures not used for ranked prospects

- **350 Bleecker St** and **1600 Pearl St, Boulder** have store/OSM coverage fixtures (`scripts/qa/store-coverage-audit.mjs`) but **no recorded Qloo insight fixture** for ranked top-10; see `docs/qa/store-coverage-audit.md` for ATP/OSM mismatch tables.
