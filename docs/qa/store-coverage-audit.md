# Store coverage audit (ATP vs OSM snapshot)

Generated: 2026-10-23T22:19:47.592Z

Radius: **10 km** per site. Brands scanned: **227** (tracked chains).

## Why REI SoHo was missing from OSM tiles (fixed)

- **Not** a bbox issue: the snapshot query is US-wide `nwr["brand:wikidata"="Q3414933"](area.us)`.
- **Not** missing OSM tags: [node 2483671757](https://www.openstreetmap.org/node/2483671757) has `brand=REI` and `brand:wikidata=Q3414933`.
- **Root cause:** `build-osm-snapshot.mjs` wrote tile coordinates as `round(lat*1e5)` while readers expect **decimal degrees**. Rows with `|lat|>90` were removed by `fix-scaled-tile-coords.mjs`, dropping SoHo and other urban stores.
- **Fix:** tiles now store `[brandIdx, lat, lon]` in degrees. Rebuild the OSM snapshot on a VM after pulling raw Overpass JSON.
- **ATP:** All The Places CC0 still has no SoHo point (~32 km nearest at Bleecker). `data/store-location-supplements.json` keeps an **ATP-only** row citing the OSM node until ATP upstream updates.

## Summary counts

- **Total mismatches:** 380
- **OSM snapshot gap** (chain not in offline OSM tiles — ATP present, OSM absent): 332
- **OSM gap** (both in snapshot; ATP has a store OSM misses): 35
- **ATP gap** (OSM has a store ATP misses): 13
- **Radius edge** (nearest store just outside 10 km in one source): 0
- Brands with Wikidata in snapshot but 0 tiled points: 1
- Brands in OSM snapshot index: 82 / 227 tracked

### Hand review sample (n=20, seed 728)

Spot-check of 20 random mismatches (same buckets as above): `osm_snapshot_gap` 17/20, `atp_gap` 2/20, `osm_gap` 1/20. No Wikidata tag-matching bugs found in this draw; remaining `osm_gap` / `atp_gap` rows are incomplete source coverage or metro sparsity, not coordinate or brand-matcher errors.

| Site | Brand | Risk | Bucket | ATP km | OSM km | ATP nearest km |
|---|---|---|---|---:|---:|---:|
| Sevierville | Red Lobster | osm_false_absence | osm_snapshot_gap | 3.92 | - | 3.92 |
| 350 Bleecker | Build-A-Bear Workshop | atp_false_absence | atp_gap | - | 2.21 | 22.01 |
| 350 Bleecker | Carter's | osm_false_absence | osm_snapshot_gap | 3.06 | - | 3.06 |
| 1600 Pearl | Barnes & Noble | osm_false_absence | osm_gap | 2.08 | - | 2.08 |
| 1600 Pearl | Crumbl | atp_false_absence | atp_gap | - | 1.76 | 19.01 |
| 350 Bleecker | Insomnia Cookies | osm_false_absence | osm_snapshot_gap | 0.17 | - | 0.17 |
| 1600 Pearl | Crunch Fitness | osm_false_absence | osm_snapshot_gap | 2.00 | - | 2.00 |
| Sevierville | Sunglass Hut | osm_false_absence | osm_snapshot_gap | 3.97 | - | 3.97 |
| 350 Bleecker | Wawa | osm_false_absence | osm_snapshot_gap | 7.85 | - | 7.85 |
| 350 Bleecker | Nike | osm_false_absence | osm_snapshot_gap | 0.96 | - | 0.96 |
| 350 Bleecker | Paper Source | osm_false_absence | osm_snapshot_gap | 0.91 | - | 0.91 |
| 350 Bleecker | IHOP | osm_false_absence | osm_snapshot_gap | 1.41 | - | 1.41 |
| 350 Bleecker | Smashburger | osm_false_absence | osm_snapshot_gap | 4.53 | - | 4.53 |
| Sevierville | Talbots | osm_false_absence | osm_snapshot_gap | 4.12 | - | 4.12 |
| 350 Bleecker | Gap | osm_false_absence | osm_snapshot_gap | 1.22 | - | 1.22 |
| 350 Bleecker | Wingstop | osm_false_absence | osm_snapshot_gap | 0.54 | - | 0.54 |
| 350 Bleecker | Tropical Smoothie Cafe | osm_false_absence | osm_snapshot_gap | 6.65 | - | 6.65 |
| 350 Bleecker | Dave & Buster's | osm_false_absence | osm_snapshot_gap | 2.85 | - | 2.85 |
| 350 Bleecker | Yard House | osm_false_absence | osm_snapshot_gap | 2.73 | - | 2.73 |
| Sevierville | Taco Bell | osm_false_absence | osm_snapshot_gap | 1.67 | - | 1.67 |


| Site | All mismatches | OSM snapshot gap | OSM gap | ATP gap | Radius edge |
|------|----------------|------------------|---------|---------|-------------|
| Wicker Park demo chip | 100 | 90 | 7 | 3 | 0 |
| Boulder demo chip | 51 | 44 | 6 | 1 | 0 |
| Sevierville demo chip | 71 | 56 | 10 | 5 | 0 |
| 350 Bleecker St | 107 | 98 | 6 | 3 | 0 |
| 1600 Pearl St Boulder | 51 | 44 | 6 | 1 | 0 |

## Wicker Park demo chip

Address: `1560 N Milwaukee Ave, Chicago, IL 60622` (41.9088, -87.6776)

| Brand | Risk | ATP nearest km | OSM nearest km |
|-------|------|----------------|----------------|
| American Eagle Outfitters | atp_false_absence | - | 1.99 |
| Au Bon Pain | atp_false_absence | - | 3.87 |
| Aveda | osm_false_absence | 3.75 | - |
| Barnes & Noble | osm_false_absence | 0.25 | - |
| Brooks Brothers | osm_false_absence | 4.38 | - |
| Build-A-Bear Workshop | atp_false_absence | - | 4.87 |
| Carter's | osm_false_absence | 4.67 | - |
| Casper | osm_false_absence | 3.45 | - |
| Cava | osm_false_absence | 0.22 | - |
| Chico's | osm_false_absence | 4.60 | - |
| Church's Chicken | osm_false_absence | 3.58 | - |
| Coach | osm_false_absence | 4.77 | - |
| CorePower Yoga | osm_false_absence | 0.55 | - |
| Cost Plus World Market | osm_false_absence | 5.47 | - |
| DSW | osm_false_absence | 2.21 | - |
| Dunkin' | osm_false_absence | 0.67 | - |
| Einstein Bros. Bagels | osm_false_absence | 4.51 | - |
| Express | osm_false_absence | 4.68 | - |
| Finish Line | osm_false_absence | 4.68 | - |
| Foot Locker | osm_false_absence | 0.96 | - |
| Fresh Market | osm_false_absence | 3.50 | - |
| GameStop | osm_false_absence | 4.70 | - |
| Gap | osm_false_absence | 3.84 | - |
| H&M | osm_false_absence | 4.69 | - |
| Hollister | osm_false_absence | 4.60 | - |
| HomeGoods | osm_false_absence | 1.99 | - |
| Hooters | osm_false_absence | 3.89 | - |
| IHOP | osm_false_absence | 3.08 | - |
| Insomnia Cookies | osm_false_absence | 0.19 | - |
| J.Crew | osm_false_absence | 3.58 | - |
| J.Jill | osm_false_absence | 4.68 | - |
| Jamba | osm_false_absence | 4.31 | - |
| Kate Spade | osm_false_absence | 4.54 | - |
| Kay Jewelers | osm_false_absence | 5.41 | - |
| Kendra Scott | osm_false_absence | 4.07 | - |
| LA Fitness | osm_false_absence | 3.65 | - |
| Lego | osm_false_absence | 4.60 | - |
| LensCrafters | osm_false_absence | 3.73 | - |
| Levi's | osm_false_absence | 0.14 | - |
| Lululemon | osm_false_absence | 2.05 | - |
| Lush | osm_false_absence | 0.47 | - |
| MAC Cosmetics | osm_false_absence | 4.46 | - |
| Macy's | osm_false_absence | 4.95 | - |
| Madewell | osm_false_absence | 3.58 | - |
| Maggiano's Little Italy | osm_false_absence | 4.34 | - |
| Marco's Pizza | osm_false_absence | 8.14 | - |
| Marshalls | osm_false_absence | 1.86 | - |
| Massage Envy | osm_false_absence | 2.07 | - |
| Men's Wearhouse | osm_false_absence | 1.72 | - |
| Moe's Southwest Grill | osm_false_absence | 4.81 | - |
| Nando's | osm_false_absence | 2.62 | - |
| Neiman Marcus | osm_false_absence | 4.66 | - |
| Nike | osm_false_absence | 4.73 | - |
| Noodles & Company | osm_false_absence | 1.79 | - |
| Nordstrom | osm_false_absence | 4.66 | - |
| Old Navy | osm_false_absence | 1.89 | - |
| Orangetheory Fitness | osm_false_absence | 0.75 | - |
| P.F. Chang's | osm_false_absence | 4.10 | - |
| Paper Source | osm_false_absence | 2.35 | - |
| Party City | osm_false_absence | 5.14 | - |
| Peet's Coffee | osm_false_absence | 1.97 | - |
| PetSmart | osm_false_absence | 2.21 | - |
| Philz Coffee | osm_false_absence | 0.89 | - |
| Portillo's | osm_false_absence | 4.12 | - |
| Potbelly | osm_false_absence | 0.25 | - |
| Pottery Barn | osm_false_absence | 1.97 | - |
| Pret A Manger | osm_false_absence | 4.10 | - |
| Qdoba | osm_false_absence | 3.24 | - |
| Ross Dress for Less | osm_false_absence | 2.31 | - |
| Sam's Club | osm_false_absence | 9.00 | - |
| Sephora | osm_false_absence | 2.05 | - |
| Skechers | osm_false_absence | 2.67 | - |
| Smashburger | osm_false_absence | 9.20 | - |
| Smoothie King | osm_false_absence | 3.98 | - |
| solidcore | osm_false_absence | 0.89 | - |
| SoulCycle | osm_false_absence | 3.63 | - |
| Subway | osm_false_absence | 0.78 | - |
| Sunglass Hut | osm_false_absence | 4.46 | - |
| Sweetgreen | osm_false_absence | 0.30 | - |
| T-Mobile | osm_false_absence | 0.90 | - |
| Taco Bell | osm_false_absence | 0.31 | - |
| Tempur-Pedic | osm_false_absence | 1.76 | - |
| The Home Depot | osm_false_absence | 1.58 | - |
| The North Face | osm_false_absence | 4.77 | - |
| Tiffany & Co. | osm_false_absence | 4.58 | - |
| TJ Maxx | osm_false_absence | 3.81 | - |
| Trader Joe's | osm_false_absence | 1.96 | - |
| Tropical Smoothie Cafe | osm_false_absence | 0.22 | - |
| Ulta | osm_false_absence | 0.90 | - |
| Verizon | osm_false_absence | 0.27 | - |
| Victoria's Secret | osm_false_absence | 4.58 | - |
| Vuori | osm_false_absence | 4.18 | - |
| Walgreens | osm_false_absence | 0.50 | - |
| Walmart | osm_false_absence | 6.15 | - |
| Warby Parker | osm_false_absence | 0.25 | - |
| Wendy's | osm_false_absence | 1.02 | - |
| White House Black Market | osm_false_absence | 4.74 | - |
| Whole Foods Market | osm_false_absence | 2.04 | - |
| Williams-Sonoma | osm_false_absence | 2.12 | - |
| Wingstop | osm_false_absence | 0.25 | - |

## Boulder demo chip

Address: `1300 Pearl St, Boulder, CO 80302` (40.015, -105.2705)

| Brand | Risk | ATP nearest km | OSM nearest km |
|-------|------|----------------|----------------|
| Barnes & Noble | osm_false_absence | 1.66 | - |
| Cava | osm_false_absence | 1.17 | - |
| CorePower Yoga | osm_false_absence | 0.91 | - |
| Cost Plus World Market | osm_false_absence | 0.78 | - |
| Crumbl | atp_false_absence | - | 1.24 |
| Crunch Fitness | osm_false_absence | 1.51 | - |
| DSW | osm_false_absence | 0.76 | - |
| Dunkin' | osm_false_absence | 2.33 | - |
| Einstein Bros. Bagels | osm_false_absence | 1.00 | - |
| F45 Training | osm_false_absence | 1.28 | - |
| HomeGoods | osm_false_absence | 0.82 | - |
| IHOP | osm_false_absence | 0.99 | - |
| Insomnia Cookies | osm_false_absence | 0.82 | - |
| J.Crew | osm_false_absence | 1.15 | - |
| J.Jill | osm_false_absence | 1.36 | - |
| Jamba | osm_false_absence | 1.58 | - |
| Kay Jewelers | osm_false_absence | 0.92 | - |
| LensCrafters | osm_false_absence | 1.31 | - |
| Little Caesars | osm_false_absence | 2.33 | - |
| Lululemon | osm_false_absence | 1.28 | - |
| Lush | osm_false_absence | 0.88 | - |
| Madewell | osm_false_absence | 1.36 | - |
| Marshalls | osm_false_absence | 1.09 | - |
| Men's Wearhouse | osm_false_absence | 1.07 | - |
| Natural Grocers | osm_false_absence | 1.26 | - |
| Noodles & Company | osm_false_absence | 1.06 | - |
| Orangetheory Fitness | osm_false_absence | 1.31 | - |
| Party City | osm_false_absence | 1.15 | - |
| PetSmart | osm_false_absence | 1.51 | - |
| Pizza Hut | osm_false_absence | 1.46 | - |
| Qdoba | osm_false_absence | 0.98 | - |
| Safeway | osm_false_absence | 0.92 | - |
| Sephora | osm_false_absence | 1.28 | - |
| solidcore | osm_false_absence | 0.73 | - |
| Sprouts Farmers Market | osm_false_absence | 0.73 | - |
| Subway | osm_false_absence | 0.90 | - |
| Sunglass Hut | osm_false_absence | 1.31 | - |
| Sweetgreen | osm_false_absence | 0.59 | - |
| T-Mobile | osm_false_absence | 1.07 | - |
| Taco Bell | osm_false_absence | 1.82 | - |
| The Home Depot | osm_false_absence | 1.32 | - |
| The North Face | osm_false_absence | 0.80 | - |
| Torchy's Tacos | osm_false_absence | 1.39 | - |
| Trader Joe's | osm_false_absence | 1.20 | - |
| Verizon | osm_false_absence | 1.07 | - |
| Vuori | osm_false_absence | 1.31 | - |
| Walgreens | osm_false_absence | 0.97 | - |
| Warby Parker | osm_false_absence | 1.36 | - |
| Wendy's | osm_false_absence | 1.89 | - |
| Whole Foods Market | osm_false_absence | 1.52 | - |
| Wingstop | osm_false_absence | 2.13 | - |

## Sevierville demo chip

Address: `125 Collier Dr, Sevierville, TN 37862` (35.8681, -83.5618)

| Brand | Risk | ATP nearest km | OSM nearest km |
|-------|------|----------------|----------------|
| Abercrombie & Fitch | osm_false_absence | 3.94 | - |
| Adidas | atp_false_absence | - | 4.17 |
| Aerie | osm_false_absence | 4.10 | - |
| American Eagle Outfitters | osm_false_absence | 3.99 | - |
| Anytime Fitness | osm_false_absence | 6.45 | - |
| AT&T | atp_false_absence | - | 1.10 |
| Banana Republic | atp_false_absence | - | 3.99 |
| Brooks Brothers | atp_false_absence | - | 3.87 |
| Carter's | osm_false_absence | 4.03 | - |
| Casey's | osm_false_absence | 2.78 | - |
| Claire's | osm_false_absence | 4.03 | - |
| Coach | osm_false_absence | 3.99 | - |
| Columbia Sportswear | osm_false_absence | 3.97 | - |
| Crumbl | osm_false_absence | 6.84 | - |
| Dave & Buster's | osm_false_absence | 3.76 | - |
| Dunkin' | osm_false_absence | 0.78 | - |
| Firehouse Subs | osm_false_absence | 1.45 | - |
| Fossil | osm_false_absence | 3.94 | - |
| Freddy's Frozen Custard & Steakburgers | osm_false_absence | 1.80 | - |
| GameStop | osm_false_absence | 1.16 | - |
| Gap | osm_false_absence | 3.86 | - |
| Hardee's | osm_false_absence | 1.06 | - |
| Hobby Lobby | osm_false_absence | 1.56 | - |
| Hollister | osm_false_absence | 4.03 | - |
| HomeGoods | osm_false_absence | 2.27 | - |
| Hot Topic | osm_false_absence | 4.01 | - |
| IHOP | osm_false_absence | 4.51 | - |
| Kate Spade | osm_false_absence | 4.01 | - |
| Kay Jewelers | osm_false_absence | 4.10 | - |
| Krispy Kreme | osm_false_absence | 1.80 | - |
| Lane Bryant | osm_false_absence | 4.10 | - |
| Levi's | osm_false_absence | 3.86 | - |
| Little Caesars | atp_false_absence | - | 0.84 |
| LongHorn Steakhouse | osm_false_absence | 4.27 | - |
| Lululemon | osm_false_absence | 3.86 | - |
| Marco's Pizza | osm_false_absence | 7.34 | - |
| Marshalls | osm_false_absence | 8.13 | - |
| Nike | osm_false_absence | 3.97 | - |
| Old Navy | osm_false_absence | 3.86 | - |
| Ollie's Bargain Outlet | osm_false_absence | 0.97 | - |
| Outback Steakhouse | osm_false_absence | 4.25 | - |
| Papa John's | osm_false_absence | 1.03 | - |
| Party City | osm_false_absence | 1.75 | - |
| PetSmart | osm_false_absence | 1.56 | - |
| Red Lobster | osm_false_absence | 3.92 | - |
| Ross Dress for Less | osm_false_absence | 1.66 | - |
| Sally Beauty | osm_false_absence | 3.48 | - |
| Skechers | osm_false_absence | 2.41 | - |
| Smoothie King | osm_false_absence | 1.16 | - |
| Subway | osm_false_absence | 0.80 | - |
| Sunglass Hut | osm_false_absence | 3.97 | - |
| T-Mobile | osm_false_absence | 1.41 | - |
| Taco Bell | osm_false_absence | 1.67 | - |
| Talbots | osm_false_absence | 4.12 | - |
| Texas Roadhouse | osm_false_absence | 3.35 | - |
| The Home Depot | osm_false_absence | 1.23 | - |
| The North Face | osm_false_absence | 3.86 | - |
| TJ Maxx | osm_false_absence | 0.57 | - |
| Tropical Smoothie Cafe | osm_false_absence | 6.48 | - |
| Ulta | osm_false_absence | 1.66 | - |
| Under Armour | osm_false_absence | 4.19 | - |
| Vans | osm_false_absence | 3.94 | - |
| Verizon | osm_false_absence | 3.21 | - |
| Victoria's Secret | osm_false_absence | 4.18 | - |
| Waffle House | osm_false_absence | 0.71 | - |
| Walgreens | osm_false_absence | 0.66 | - |
| Walmart | osm_false_absence | 3.52 | - |
| Wendy's | osm_false_absence | 0.57 | - |
| Whataburger | osm_false_absence | 3.58 | - |
| Wingstop | osm_false_absence | 1.82 | - |
| Zaxby's | osm_false_absence | 1.75 | - |

## 350 Bleecker St

Address: `350 Bleecker St, New York, NY 10014` (40.73352, -74.00271)

| Brand | Risk | ATP nearest km | OSM nearest km |
|-------|------|----------------|----------------|
| Aerie | osm_false_absence | 1.13 | - |
| Ann Taylor | osm_false_absence | 1.29 | - |
| Barnes & Noble | osm_false_absence | 1.22 | - |
| Big Lots | atp_false_absence | - | 5.46 |
| Bonefish Grill | atp_false_absence | - | 7.54 |
| Build-A-Bear Workshop | atp_false_absence | - | 2.21 |
| Carter's | osm_false_absence | 3.06 | - |
| Casper | osm_false_absence | 0.96 | - |
| Cava | osm_false_absence | 0.71 | - |
| Chico's | osm_false_absence | 8.15 | - |
| Coach | osm_false_absence | 0.85 | - |
| Columbia Sportswear | osm_false_absence | 9.99 | - |
| CorePower Yoga | osm_false_absence | 0.32 | - |
| Crunch Fitness | osm_false_absence | 1.02 | - |
| Dave & Buster's | osm_false_absence | 2.85 | - |
| Dick's Sporting Goods | osm_false_absence | 2.95 | - |
| DSW | osm_false_absence | 0.92 | - |
| Dunkin' | osm_false_absence | 0.06 | - |
| Express | osm_false_absence | 3.06 | - |
| Firehouse Subs | osm_false_absence | 3.15 | - |
| Foot Locker | osm_false_absence | 0.69 | - |
| GameStop | osm_false_absence | 0.92 | - |
| Gap | osm_false_absence | 1.22 | - |
| H&M | osm_false_absence | 1.06 | - |
| Hobby Lobby | osm_false_absence | 2.07 | - |
| Hollister | osm_false_absence | 1.26 | - |
| HomeGoods | osm_false_absence | 7.43 | - |
| Hot Topic | osm_false_absence | 9.85 | - |
| IHOP | osm_false_absence | 1.41 | - |
| IKEA | osm_false_absence | 6.88 | - |
| Insomnia Cookies | osm_false_absence | 0.17 | - |
| J.Crew | osm_false_absence | 1.03 | - |
| J.Jill | osm_false_absence | 4.92 | - |
| Jamba | osm_false_absence | 1.77 | - |
| JCPenney | osm_false_absence | 3.09 | - |
| Kate Spade | osm_false_absence | 1.29 | - |
| Kay Jewelers | osm_false_absence | 3.04 | - |
| Kendra Scott | osm_false_absence | 1.06 | - |
| Krispy Kreme | osm_false_absence | 2.04 | - |
| LA Fitness | osm_false_absence | 7.04 | - |
| Le Pain Quotidien | osm_false_absence | 1.29 | - |
| Lego | osm_false_absence | 1.43 | - |
| LensCrafters | osm_false_absence | 0.62 | - |
| Levi's | osm_false_absence | 1.30 | - |
| Lidl | osm_false_absence | 1.57 | - |
| Lululemon | osm_false_absence | 0.88 | - |
| Lush | osm_false_absence | 0.92 | - |
| Macy's | osm_false_absence | 3.01 | - |
| Madewell | osm_false_absence | 1.13 | - |
| Marshalls | osm_false_absence | 0.97 | - |
| Massage Envy | osm_false_absence | 1.95 | - |
| Men's Wearhouse | osm_false_absence | 1.11 | - |
| Michael Kors | osm_false_absence | 3.43 | - |
| Moe's Southwest Grill | osm_false_absence | 8.00 | - |
| Nike | osm_false_absence | 0.96 | - |
| Nordstrom | osm_false_absence | 0.41 | - |
| Old Navy | osm_false_absence | 0.97 | - |
| Orangetheory Fitness | osm_false_absence | 0.24 | - |
| Outback Steakhouse | osm_false_absence | 7.12 | - |
| P.F. Chang's | osm_false_absence | 0.90 | - |
| Paper Source | osm_false_absence | 0.91 | - |
| Party City | osm_false_absence | 0.94 | - |
| PetSmart | osm_false_absence | 1.50 | - |
| Potbelly | osm_false_absence | 2.19 | - |
| Pottery Barn | osm_false_absence | 1.15 | - |
| Pret A Manger | osm_false_absence | 1.11 | - |
| Qdoba | osm_false_absence | 2.45 | - |
| Red Lobster | osm_false_absence | 6.88 | - |
| Ross Dress for Less | osm_false_absence | 2.44 | - |
| Ruth's Chris Steak House | osm_false_absence | 2.93 | - |
| Sam's Club | osm_false_absence | 7.37 | - |
| Sephora | osm_false_absence | 0.77 | - |
| Skechers | osm_false_absence | 1.21 | - |
| Smashburger | osm_false_absence | 4.53 | - |
| Snap Fitness | osm_false_absence | 3.88 | - |
| solidcore | osm_false_absence | 0.40 | - |
| SoulCycle | osm_false_absence | 0.59 | - |
| Subway | osm_false_absence | 0.75 | - |
| Sunglass Hut | osm_false_absence | 0.62 | - |
| Sweetgreen | osm_false_absence | 0.67 | - |
| T-Mobile | osm_false_absence | 0.91 | - |
| Taco Bell | osm_false_absence | 0.54 | - |
| Talbots | osm_false_absence | 6.20 | - |
| Tempur-Pedic | osm_false_absence | 4.31 | - |
| The Home Depot | osm_false_absence | 1.31 | - |
| The North Face | osm_false_absence | 1.03 | - |
| Tiffany & Co. | osm_false_absence | 1.08 | - |
| TJ Maxx | osm_false_absence | 0.97 | - |
| Tommy Bahama | osm_false_absence | 3.11 | - |
| Trader Joe's | osm_false_absence | 0.86 | - |
| Tropical Smoothie Cafe | osm_false_absence | 6.65 | - |
| Ulta | osm_false_absence | 0.97 | - |
| Under Armour | osm_false_absence | 2.49 | - |
| Vans | osm_false_absence | 3.06 | - |
| Verizon | osm_false_absence | 0.29 | - |
| Victoria's Secret | osm_false_absence | 1.32 | - |
| Vuori | osm_false_absence | 1.03 | - |
| Walgreens | osm_false_absence | 1.83 | - |
| Warby Parker | osm_false_absence | 0.85 | - |
| Wawa | osm_false_absence | 7.85 | - |
| Wegmans | osm_false_absence | 0.94 | - |
| Wendy's | osm_false_absence | 0.83 | - |
| Whole Foods Market | osm_false_absence | 1.00 | - |
| Williams-Sonoma | osm_false_absence | 0.79 | - |
| Wingstop | osm_false_absence | 0.54 | - |
| Yard House | osm_false_absence | 2.73 | - |
| Zaxby's | osm_false_absence | 5.22 | - |

## 1600 Pearl St Boulder

Address: `1600 Pearl St, Boulder, CO 80302` (40.01739, -105.27727)

| Brand | Risk | ATP nearest km | OSM nearest km |
|-------|------|----------------|----------------|
| Barnes & Noble | osm_false_absence | 2.08 | - |
| Cava | osm_false_absence | 1.73 | - |
| CorePower Yoga | osm_false_absence | 1.05 | - |
| Cost Plus World Market | osm_false_absence | 0.82 | - |
| Crumbl | atp_false_absence | - | 1.76 |
| Crunch Fitness | osm_false_absence | 2.00 | - |
| DSW | osm_false_absence | 1.39 | - |
| Dunkin' | osm_false_absence | 2.41 | - |
| Einstein Bros. Bagels | osm_false_absence | 1.56 | - |
| F45 Training | osm_false_absence | 1.81 | - |
| HomeGoods | osm_false_absence | 1.44 | - |
| IHOP | osm_false_absence | 1.56 | - |
| Insomnia Cookies | osm_false_absence | 0.94 | - |
| J.Crew | osm_false_absence | 1.75 | - |
| J.Jill | osm_false_absence | 1.90 | - |
| Jamba | osm_false_absence | 2.17 | - |
| Kay Jewelers | osm_false_absence | 1.55 | - |
| LensCrafters | osm_false_absence | 1.82 | - |
| Little Caesars | osm_false_absence | 2.41 | - |
| Lululemon | osm_false_absence | 1.81 | - |
| Lush | osm_false_absence | 0.24 | - |
| Madewell | osm_false_absence | 1.90 | - |
| Marshalls | osm_false_absence | 1.64 | - |
| Men's Wearhouse | osm_false_absence | 1.65 | - |
| Natural Grocers | osm_false_absence | 1.60 | - |
| Noodles & Company | osm_false_absence | 1.66 | - |
| Orangetheory Fitness | osm_false_absence | 1.82 | - |
| Party City | osm_false_absence | 1.75 | - |
| PetSmart | osm_false_absence | 2.00 | - |
| Pizza Hut | osm_false_absence | 1.88 | - |
| Qdoba | osm_false_absence | 1.58 | - |
| Safeway | osm_false_absence | 1.55 | - |
| Sephora | osm_false_absence | 1.81 | - |
| solidcore | osm_false_absence | 1.35 | - |
| Sprouts Farmers Market | osm_false_absence | 1.31 | - |
| Subway | osm_false_absence | 1.24 | - |
| Sunglass Hut | osm_false_absence | 1.82 | - |
| Sweetgreen | osm_false_absence | 0.26 | - |
| T-Mobile | osm_false_absence | 1.68 | - |
| Taco Bell | osm_false_absence | 2.33 | - |
| The Home Depot | osm_false_absence | 1.90 | - |
| The North Face | osm_false_absence | 0.16 | - |
| Torchy's Tacos | osm_false_absence | 1.76 | - |
| Trader Joe's | osm_false_absence | 1.67 | - |
| Verizon | osm_false_absence | 1.65 | - |
| Vuori | osm_false_absence | 1.82 | - |
| Walgreens | osm_false_absence | 1.17 | - |
| Warby Parker | osm_false_absence | 1.90 | - |
| Wendy's | osm_false_absence | 2.38 | - |
| Whole Foods Market | osm_false_absence | 1.01 | - |
| Wingstop | osm_false_absence | 2.25 | - |
