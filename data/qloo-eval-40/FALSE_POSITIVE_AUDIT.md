# False-positive audit: missing-brand prospects

Generated: 2026-10-24T00:27:16.083Z

Offline audit of **top-10 “who’s missing” prospects** per site. A false positive is a prospect shown as absent while **any** repo store source (ATP expanded, worker geotiles, OSM snapshot tiles, supplements, or eval `ground_truth.json` counts) has a location within the analyze radius.

## Summary counts

| Metric | Before | After |
|--------|--------|-------|
| Sites audited | 13 | 13 |
| Prospect rows (top-10 per site) | 116 | 116 |
| **False positives** (store present, still pitched) | **4** | **0** |
| OSM-only presence (would have slipped without snapshot verify) | 0 | — |

**Before** row replays analyze with `verifyFromOsmSnapshot` forced to never emit `conflict - likely present` (OSM in-radius stores could be pitched as missing). **After** is current `cursor/leaseup-v1-c429` with geotile catalog + snapshot conflict filtering.

### Before baseline cases (fixed by snapshot verify)

- Wicker Park demo chip — American Eagle Outfitters (ATP — km, OSM 1.92 km)
- Boulder demo chip — Crumbl (ATP — km, OSM 1.86 km)
- Lakeview Chicago — Crumbl (ATP — km, OSM 0.67 km)
- Naperville IL — Kohl's (ATP — km, OSM 4.98 km)

### Sites

| Site | Category | Radius km | Prospects | FP after |
|------|----------|-----------|-----------|----------|
| Wicker Park demo chip | dense_urban | 10 | 4 | 0 |
| Boulder demo chip | college_town | 10 | 9 | 0 |
| Sevierville demo chip | tourist | 10 | 10 | 0 |
| Lakeview Chicago | dense_urban | 1.5 | 9 | 0 |
| Williamsburg Brooklyn | dense_urban | 1.5 | 10 | 0 |
| Naperville IL | affluent_suburban | 5 | 9 | 0 |
| Wellesley MA | affluent_suburban | 15 | 5 | 0 |
| Hutchinson KS | small_town | 15 | 10 | 0 |
| Sedalia MO | small_town | 5 | 10 | 0 |
| Ann Arbor MI | college_town | 5 | 10 | 0 |
| Frisco TX strip | sunbelt_growth | 5 | 10 | 0 |
| Gilbert AZ | sunbelt_growth | 5 | 10 | 0 |
| Branson MO | tourist | 5 | 10 | 0 |

## Per-site top-10

### Wicker Park demo chip

Address: `1560 N Milwaukee Ave, Chicago, IL 60622` (41.90970, -87.67683), radius **10 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Vans | unverified (1 source) | — | — | — | no |
| 2 | Aerie | unverified (1 source) | — | — | — | no |
| 3 | Michael Kors | unverified (1 source) | — | — | — | no |
| 4 | Under Armour | unverified (1 source) | — | — | — | no |

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
| 1 | Michaels | verified (2 sources) | — | — | — | no |
| 2 | Kohl's | verified (2 sources) | — | — | — | no |
| 3 | J.Crew | unverified (1 source) | — | — | — | no |
| 4 | Trader Joe's | unverified (1 source) | — | — | — | no |
| 5 | Sephora | unverified (1 source) | — | — | — | no |
| 6 | Whole Foods Market | unverified (1 source) | — | — | — | no |
| 7 | H&M | unverified (1 source) | — | — | — | no |
| 8 | Express | unverified (1 source) | — | — | — | no |
| 9 | Warby Parker | unverified (1 source) | — | — | — | no |
| 10 | Apple | verified (2 sources) | — | — | — | no |

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
| 1 | TJ Maxx | unverified (1 source) | — | — | — | no |
| 2 | Hobby Lobby | unverified (1 source) | — | — | — | no |
| 3 | HomeGoods | unverified (1 source) | — | — | — | no |
| 4 | Victoria's Secret | unverified (1 source) | — | — | — | no |
| 5 | J.Crew | unverified (1 source) | — | — | — | no |
| 6 | Foot Locker | unverified (1 source) | — | — | — | no |
| 7 | H&M | unverified (1 source) | — | — | — | no |
| 8 | Vans | unverified (1 source) | — | — | — | no |
| 9 | Express | unverified (1 source) | — | — | — | no |

### Wellesley MA

Address: `60 Central St, Wellesley, MA 02482` (42.29596, -71.29798), radius **15 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Michael Kors | unverified (1 source) | — | — | — | no |
| 2 | Adidas | verified (2 sources) | — | — | — | no |
| 3 | Under Armour | unverified (1 source) | — | — | — | no |
| 4 | Kate Spade | unverified (1 source) | — | — | — | no |
| 5 | Neiman Marcus | unverified (1 source) | — | — | — | no |

### Hutchinson KS

Address: `100 N Main St, Hutchinson, KS 67501` (38.05356, -97.93174), radius **15 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | QuikTrip | unverified (1 source) | — | — | — | no |
| 2 | Michaels | verified (2 sources) | — | — | — | no |
| 3 | Old Navy | verified (2 sources) | — | — | — | no |
| 4 | HomeGoods | unverified (1 source) | — | — | — | no |
| 5 | Crumbl | verified (2 sources) | — | — | — | no |
| 6 | Victoria's Secret | unverified (1 source) | — | — | — | no |
| 7 | American Eagle Outfitters | verified (2 sources) | — | — | — | no |
| 8 | Trader Joe's | unverified (1 source) | — | — | — | no |
| 9 | J.Crew | unverified (1 source) | — | — | — | no |
| 10 | Foot Locker | unverified (1 source) | — | — | — | no |

### Sedalia MO

Address: `200 S Ohio Ave, Sedalia, MO 65301` (38.70967, -93.22799), radius **5 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Ulta | unverified (1 source) | — | — | — | no |
| 2 | QuikTrip | unverified (1 source) | — | — | — | no |
| 3 | HomeGoods | unverified (1 source) | — | — | — | no |
| 4 | Crumbl | verified (2 sources) | — | — | — | no |
| 5 | Victoria's Secret | unverified (1 source) | — | — | — | no |
| 6 | American Eagle Outfitters | verified (2 sources) | — | — | — | no |
| 7 | Trader Joe's | unverified (1 source) | — | — | — | no |
| 8 | Sephora | unverified (1 source) | — | — | — | no |
| 9 | Whole Foods Market | unverified (1 source) | — | — | — | no |
| 10 | Lululemon | unverified (1 source) | — | — | — | no |

### Ann Arbor MI

Address: `300 S State St, Ann Arbor, MI 48104` (42.27925, -83.74095), radius **5 km**.

| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |
|---|-------|----------|--------|--------|------------|------------------|
| 1 | Michaels | verified (2 sources) | — | — | — | no |
| 2 | Marshalls | unverified (1 source) | — | — | — | no |
| 3 | Hobby Lobby | unverified (1 source) | — | — | — | no |
| 4 | Sephora | unverified (1 source) | — | — | — | no |
| 5 | H&M | unverified (1 source) | — | — | — | no |
| 6 | DSW | unverified (1 source) | — | — | — | no |
| 7 | Aerie | unverified (1 source) | — | — | — | no |
| 8 | Banana Republic | verified (2 sources) | — | — | — | no |
| 9 | Nike | unverified (1 source) | — | — | — | no |
| 10 | Michael Kors | unverified (1 source) | — | — | — | no |

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
| 10 | JCPenney | unverified (1 source) | — | — | — | no |

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
| 2 | Marshalls | unverified (1 source) | — | — | — | no |
| 3 | HomeGoods | unverified (1 source) | — | — | — | no |
| 4 | Crumbl | verified (2 sources) | — | — | — | no |
| 5 | J.Crew | unverified (1 source) | — | — | — | no |
| 6 | Trader Joe's | unverified (1 source) | — | — | — | no |
| 7 | Sephora | unverified (1 source) | — | — | — | no |
| 8 | Whole Foods Market | unverified (1 source) | — | — | — | no |
| 9 | Hollister | unverified (1 source) | — | — | — | no |
| 10 | Vans | unverified (1 source) | — | — | — | no |

## Fixtures not used for ranked prospects

- **350 Bleecker St** and **1600 Pearl St, Boulder** have store/OSM coverage fixtures (`scripts/qa/store-coverage-audit.mjs`) but **no recorded Qloo insight fixture** for ranked top-10; see `docs/qa/store-coverage-audit.md` for ATP/OSM mismatch tables.
