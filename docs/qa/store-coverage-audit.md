# Store coverage audit (ATP vs OSM snapshot)

Generated: 2026-10-23T22:01:56.470Z

Radius: **10 km** per site. Brands scanned: **227** (tracked chains).

## Why REI SoHo was missing from OSM tiles (fixed)

- **Not** a bbox issue: the snapshot query is US-wide `nwr["brand:wikidata"="Q3414933"](area.us)`.
- **Not** missing OSM tags: [node 2483671757](https://www.openstreetmap.org/node/2483671757) has `brand=REI` and `brand:wikidata=Q3414933`.
- **Root cause:** `build-osm-snapshot.mjs` wrote tile coordinates as `round(lat*1e5)` while readers expect **decimal degrees**. Rows with `|lat|>90` were removed by `fix-scaled-tile-coords.mjs`, dropping SoHo and other urban stores.
- **Fix:** tiles now store `[brandIdx, lat, lon]` in degrees. Rebuild the OSM snapshot on a VM after pulling raw Overpass JSON.
- **ATP:** All The Places CC0 still has no SoHo point (~32 km nearest at Bleecker). `data/store-location-supplements.json` keeps an **ATP-only** row citing the OSM node until ATP upstream updates.

## Summary counts

- **Total mismatches:** 519
- **Real disagreements** (both sources have national coverage): 519
- **Skew from OSM zero-point brands** (no usable OSM tile coverage): 0
- Brands with 0 OSM snapshot points: 0

| Site | All mismatches | Real disagreements | OSM zero skew |
|------|----------------|-------------------|---------------|
| Wicker Park demo chip | 140 | 140 | 0 |
| Boulder demo chip | 66 | 66 | 0 |
| Sevierville demo chip | 98 | 98 | 0 |
| 350 Bleecker St | 149 | 149 | 0 |
| 1600 Pearl St Boulder | 66 | 66 | 0 |

## Wicker Park demo chip

Address: `1560 N Milwaukee Ave, Chicago, IL 60622` (41.9088, -87.6776)

| Brand | Risk | ATP nearest km | OSM nearest km |
|-------|------|----------------|----------------|
| American Eagle Outfitters | atp_false_absence | - | 1.99 |
| Au Bon Pain | atp_false_absence | - | 3.87 |
| Aveda | osm_false_absence | 3.75 | - |
| Banana Republic | osm_false_absence | 3.73 | - |
| Barnes & Noble | osm_false_absence | 0.25 | - |
| Baskin-Robbins | osm_false_absence | 0.83 | - |
| Bath & Body Works | osm_false_absence | 1.95 | - |
| Bloomingdale's | osm_false_absence | 4.46 | - |
| Blue Bottle Coffee | osm_false_absence | 4.08 | - |
| Brooks Brothers | osm_false_absence | 4.38 | - |
| Buffalo Wild Wings | osm_false_absence | 1.79 | - |
| Build-A-Bear Workshop | atp_false_absence | - | 4.87 |
| Burger King | osm_false_absence | 1.58 | - |
| Carter's | osm_false_absence | 4.67 | - |
| Casper | osm_false_absence | 3.45 | - |
| Cava | osm_false_absence | 0.22 | - |
| Chick-fil-A | osm_false_absence | 0.90 | - |
| Chico's | osm_false_absence | 4.60 | - |
| Chipotle Mexican Grill | osm_false_absence | 0.47 | - |
| Church's Chicken | osm_false_absence | 3.58 | - |
| Claire's | osm_false_absence | 4.60 | - |
| Coach | osm_false_absence | 4.77 | - |
| CorePower Yoga | osm_false_absence | 0.55 | - |
| Cost Plus World Market | osm_false_absence | 5.47 | - |
| Costco | osm_false_absence | 2.36 | - |
| Crumbl | osm_false_absence | 5.00 | - |
| Culver's | osm_false_absence | 4.55 | - |
| Dairy Queen | osm_false_absence | 3.14 | - |
| Dick's Sporting Goods | osm_false_absence | 2.45 | - |
| Dollar General | osm_false_absence | 3.23 | - |
| Dollar Tree | osm_false_absence | 2.11 | - |
| DSW | osm_false_absence | 2.21 | - |
| Dunkin' | osm_false_absence | 0.67 | - |
| Einstein Bros. Bagels | osm_false_absence | 4.51 | - |
| European Wax Center | osm_false_absence | 0.33 | - |
| Express | osm_false_absence | 4.68 | - |
| F45 Training | osm_false_absence | 2.05 | - |
| Family Dollar | osm_false_absence | 1.46 | - |
| Finish Line | osm_false_absence | 4.68 | - |
| Five Guys | osm_false_absence | 3.52 | - |
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
| Jimmy John's | osm_false_absence | 0.66 | - |
| Kate Spade | osm_false_absence | 4.54 | - |
| Kay Jewelers | osm_false_absence | 5.41 | - |
| Kendra Scott | osm_false_absence | 4.07 | - |
| KFC | osm_false_absence | 4.61 | - |
| Kohl's | osm_false_absence | 1.33 | - |
| LA Fitness | osm_false_absence | 3.65 | - |
| Lego | osm_false_absence | 4.60 | - |
| LensCrafters | osm_false_absence | 3.73 | - |
| Levi's | osm_false_absence | 0.14 | - |
| Little Caesars | osm_false_absence | 2.69 | - |
| Lululemon | osm_false_absence | 2.05 | - |
| Lush | osm_false_absence | 0.47 | - |
| MAC Cosmetics | osm_false_absence | 4.46 | - |
| Macy's | osm_false_absence | 4.95 | - |
| Madewell | osm_false_absence | 3.58 | - |
| Maggiano's Little Italy | osm_false_absence | 4.34 | - |
| Marco's Pizza | osm_false_absence | 8.14 | - |
| Marshalls | osm_false_absence | 1.86 | - |
| Massage Envy | osm_false_absence | 2.07 | - |
| Mattress Firm | osm_false_absence | 0.45 | - |
| McDonald's | osm_false_absence | 1.20 | - |
| Men's Wearhouse | osm_false_absence | 1.72 | - |
| Michaels | osm_false_absence | 1.92 | - |
| Moe's Southwest Grill | osm_false_absence | 4.81 | - |
| Nando's | osm_false_absence | 2.62 | - |
| Neiman Marcus | osm_false_absence | 4.66 | - |
| Nike | osm_false_absence | 4.73 | - |
| Noodles & Company | osm_false_absence | 1.79 | - |
| Nordstrom | osm_false_absence | 4.66 | - |
| Old Navy | osm_false_absence | 1.89 | - |
| Orangetheory Fitness | osm_false_absence | 0.75 | - |
| P.F. Chang's | osm_false_absence | 4.10 | - |
| Panda Express | osm_false_absence | 1.95 | - |
| Panera Bread | osm_false_absence | 1.91 | - |
| Papa John's | osm_false_absence | 1.97 | - |
| Paper Source | osm_false_absence | 2.35 | - |
| Party City | osm_false_absence | 5.14 | - |
| Peet's Coffee | osm_false_absence | 1.97 | - |
| Petco | osm_false_absence | 1.79 | - |
| PetSmart | osm_false_absence | 2.21 | - |
| Philz Coffee | osm_false_absence | 0.89 | - |
| Pizza Hut | osm_false_absence | 1.05 | - |
| Planet Fitness | osm_false_absence | 5.28 | - |
| Popeyes | osm_false_absence | 1.09 | - |
| Portillo's | osm_false_absence | 4.12 | - |
| Potbelly | osm_false_absence | 0.25 | - |
| Pottery Barn | osm_false_absence | 1.97 | - |
| Pret A Manger | osm_false_absence | 4.10 | - |
| Qdoba | osm_false_absence | 3.24 | - |
| Raising Cane's | osm_false_absence | 2.97 | - |
| Ross Dress for Less | osm_false_absence | 2.31 | - |
| Sally Beauty | osm_false_absence | 1.97 | - |
| Sam's Club | osm_false_absence | 9.00 | - |
| Sephora | osm_false_absence | 2.05 | - |
| Skechers | osm_false_absence | 2.67 | - |
| Smashburger | osm_false_absence | 9.20 | - |
| Smoothie King | osm_false_absence | 3.98 | - |
| solidcore | osm_false_absence | 0.89 | - |
| Sonic Drive-In | osm_false_absence | 6.61 | - |
| SoulCycle | osm_false_absence | 3.63 | - |
| Starbucks | osm_false_absence | 0.70 | - |
| Subway | osm_false_absence | 0.78 | - |
| Sunglass Hut | osm_false_absence | 4.46 | - |
| Sweetgreen | osm_false_absence | 0.30 | - |
| T-Mobile | osm_false_absence | 0.90 | - |
| Taco Bell | osm_false_absence | 0.31 | - |
| Target | osm_false_absence | 0.89 | - |
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
| Burger King | osm_false_absence | 1.15 | - |
| Cava | osm_false_absence | 1.17 | - |
| Chipotle Mexican Grill | osm_false_absence | 1.05 | - |
| CorePower Yoga | osm_false_absence | 0.91 | - |
| Cost Plus World Market | osm_false_absence | 0.78 | - |
| Crunch Fitness | osm_false_absence | 1.51 | - |
| Dairy Queen | osm_false_absence | 2.27 | - |
| Dollar Tree | osm_false_absence | 3.71 | - |
| DSW | osm_false_absence | 0.76 | - |
| Dunkin' | osm_false_absence | 2.33 | - |
| Einstein Bros. Bagels | osm_false_absence | 1.00 | - |
| European Wax Center | osm_false_absence | 1.52 | - |
| F45 Training | osm_false_absence | 1.28 | - |
| Five Guys | osm_false_absence | 1.23 | - |
| HomeGoods | osm_false_absence | 0.82 | - |
| IHOP | osm_false_absence | 0.99 | - |
| Insomnia Cookies | osm_false_absence | 0.82 | - |
| J.Crew | osm_false_absence | 1.15 | - |
| J.Jill | osm_false_absence | 1.36 | - |
| Jamba | osm_false_absence | 1.58 | - |
| Jimmy John's | osm_false_absence | 1.75 | - |
| Kay Jewelers | osm_false_absence | 0.92 | - |
| LensCrafters | osm_false_absence | 1.31 | - |
| Little Caesars | osm_false_absence | 2.33 | - |
| Lululemon | osm_false_absence | 1.28 | - |
| Lush | osm_false_absence | 0.88 | - |
| Madewell | osm_false_absence | 1.36 | - |
| Marshalls | osm_false_absence | 1.09 | - |
| Mattress Firm | osm_false_absence | 1.08 | - |
| McDonald's | osm_false_absence | 2.22 | - |
| Men's Wearhouse | osm_false_absence | 1.07 | - |
| Michaels | osm_false_absence | 1.51 | - |
| Natural Grocers | osm_false_absence | 1.26 | - |
| Noodles & Company | osm_false_absence | 1.06 | - |
| Orangetheory Fitness | osm_false_absence | 1.31 | - |
| Panda Express | osm_false_absence | 1.52 | - |
| Panera Bread | osm_false_absence | 1.23 | - |
| Party City | osm_false_absence | 1.15 | - |
| Petco | osm_false_absence | 0.76 | - |
| PetSmart | osm_false_absence | 1.51 | - |
| Pizza Hut | osm_false_absence | 1.46 | - |
| Qdoba | osm_false_absence | 0.98 | - |
| Safeway | osm_false_absence | 0.92 | - |
| Sally Beauty | osm_false_absence | 0.73 | - |
| Sephora | osm_false_absence | 1.28 | - |
| solidcore | osm_false_absence | 0.73 | - |
| Sprouts Farmers Market | osm_false_absence | 0.73 | - |
| Starbucks | osm_false_absence | 0.92 | - |
| Subway | osm_false_absence | 0.90 | - |
| Sunglass Hut | osm_false_absence | 1.31 | - |
| Sweetgreen | osm_false_absence | 0.59 | - |
| T-Mobile | osm_false_absence | 1.07 | - |
| Taco Bell | osm_false_absence | 1.82 | - |
| Target | osm_false_absence | 1.39 | - |
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
| Baskin-Robbins | osm_false_absence | 3.36 | - |
| Bath & Body Works | osm_false_absence | 2.27 | - |
| Big Lots | osm_false_absence | 0.75 | - |
| Bojangles | osm_false_absence | 1.55 | - |
| Brooks Brothers | atp_false_absence | - | 3.87 |
| Buffalo Wild Wings | osm_false_absence | 3.27 | - |
| Burger King | osm_false_absence | 0.74 | - |
| Carter's | osm_false_absence | 4.03 | - |
| Casey's | osm_false_absence | 2.78 | - |
| Chick-fil-A | osm_false_absence | 2.08 | - |
| Chipotle Mexican Grill | osm_false_absence | 4.25 | - |
| Claire's | osm_false_absence | 4.03 | - |
| Coach | osm_false_absence | 3.99 | - |
| Columbia Sportswear | osm_false_absence | 3.97 | - |
| Crumbl | osm_false_absence | 6.84 | - |
| Culver's | osm_false_absence | 1.38 | - |
| Dairy Queen | osm_false_absence | 2.83 | - |
| Dave & Buster's | osm_false_absence | 3.76 | - |
| Denny's | osm_false_absence | 9.74 | - |
| Dick's Sporting Goods | osm_false_absence | 1.61 | - |
| Dollar General | osm_false_absence | 1.11 | - |
| Dollar Tree | osm_false_absence | 1.25 | - |
| Dunkin' | osm_false_absence | 0.78 | - |
| Dutch Bros Coffee | osm_false_absence | 0.57 | - |
| Family Dollar | osm_false_absence | 5.94 | - |
| Firehouse Subs | osm_false_absence | 1.45 | - |
| Five Guys | osm_false_absence | 6.95 | - |
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
| Jimmy John's | osm_false_absence | 1.20 | - |
| Kate Spade | osm_false_absence | 4.01 | - |
| Kay Jewelers | osm_false_absence | 4.10 | - |
| KFC | osm_false_absence | 1.67 | - |
| Krispy Kreme | osm_false_absence | 1.80 | - |
| Kroger | osm_false_absence | 1.70 | - |
| Lane Bryant | osm_false_absence | 4.10 | - |
| Levi's | osm_false_absence | 3.86 | - |
| LongHorn Steakhouse | osm_false_absence | 4.27 | - |
| Lululemon | osm_false_absence | 3.86 | - |
| Marco's Pizza | osm_false_absence | 7.34 | - |
| Marshalls | osm_false_absence | 8.13 | - |
| Mattress Firm | osm_false_absence | 1.61 | - |
| McDonald's | osm_false_absence | 0.61 | - |
| Nike | osm_false_absence | 3.97 | - |
| Old Navy | osm_false_absence | 3.86 | - |
| Ollie's Bargain Outlet | osm_false_absence | 0.97 | - |
| Outback Steakhouse | osm_false_absence | 4.25 | - |
| Panda Express | osm_false_absence | 2.32 | - |
| Papa John's | osm_false_absence | 1.03 | - |
| Party City | osm_false_absence | 1.75 | - |
| PetSmart | osm_false_absence | 1.56 | - |
| Pizza Hut | osm_false_absence | 1.27 | - |
| Popeyes | osm_false_absence | 1.02 | - |
| Publix | osm_false_absence | 1.99 | - |
| Red Lobster | osm_false_absence | 3.92 | - |
| Ross Dress for Less | osm_false_absence | 1.66 | - |
| Sally Beauty | osm_false_absence | 3.48 | - |
| Skechers | osm_false_absence | 2.41 | - |
| Smoothie King | osm_false_absence | 1.16 | - |
| Sonic Drive-In | osm_false_absence | 0.25 | - |
| Starbucks | osm_false_absence | 1.21 | - |
| Subway | osm_false_absence | 0.80 | - |
| Sunglass Hut | osm_false_absence | 3.97 | - |
| T-Mobile | osm_false_absence | 1.41 | - |
| Taco Bell | osm_false_absence | 1.67 | - |
| Talbots | osm_false_absence | 4.12 | - |
| Target | osm_false_absence | 2.37 | - |
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
| Ashley Furniture | osm_false_absence | 7.81 | - |
| Banana Republic | osm_false_absence | 1.03 | - |
| Barnes & Noble | osm_false_absence | 1.22 | - |
| Baskin-Robbins | osm_false_absence | 1.57 | - |
| Bath & Body Works | osm_false_absence | 1.51 | - |
| Bloomingdale's | osm_false_absence | 1.32 | - |
| Blue Bottle Coffee | osm_false_absence | 1.42 | - |
| Bonefish Grill | atp_false_absence | - | 7.54 |
| Buffalo Wild Wings | osm_false_absence | 2.09 | - |
| Build-A-Bear Workshop | atp_false_absence | - | 2.21 |
| Burger King | osm_false_absence | 2.09 | - |
| Carter's | osm_false_absence | 3.06 | - |
| Casper | osm_false_absence | 0.96 | - |
| Cava | osm_false_absence | 0.71 | - |
| Chick-fil-A | osm_false_absence | 1.25 | - |
| Chico's | osm_false_absence | 8.15 | - |
| Chili's | osm_false_absence | 6.98 | - |
| Chipotle Mexican Grill | osm_false_absence | 0.23 | - |
| Claire's | osm_false_absence | 3.06 | - |
| Coach | osm_false_absence | 0.85 | - |
| Columbia Sportswear | osm_false_absence | 9.99 | - |
| CorePower Yoga | osm_false_absence | 0.32 | - |
| Costco | osm_false_absence | 6.60 | - |
| Crumbl | osm_false_absence | 1.43 | - |
| Crunch Fitness | osm_false_absence | 1.02 | - |
| Dairy Queen | osm_false_absence | 7.04 | - |
| Dave & Buster's | osm_false_absence | 2.85 | - |
| Dick's Sporting Goods | osm_false_absence | 2.95 | - |
| Dollar General | osm_false_absence | 4.98 | - |
| Dollar Tree | osm_false_absence | 5.09 | - |
| DSW | osm_false_absence | 0.92 | - |
| Dunkin' | osm_false_absence | 0.06 | - |
| European Wax Center | osm_false_absence | 0.74 | - |
| Express | osm_false_absence | 3.06 | - |
| F45 Training | osm_false_absence | 0.54 | - |
| Family Dollar | osm_false_absence | 5.20 | - |
| Firehouse Subs | osm_false_absence | 3.15 | - |
| Five Guys | osm_false_absence | 0.20 | - |
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
| Jimmy John's | osm_false_absence | 0.69 | - |
| Kate Spade | osm_false_absence | 1.29 | - |
| Kay Jewelers | osm_false_absence | 3.04 | - |
| Kendra Scott | osm_false_absence | 1.06 | - |
| KFC | osm_false_absence | 1.50 | - |
| Kohl's | osm_false_absence | 2.95 | - |
| Krispy Kreme | osm_false_absence | 2.04 | - |
| LA Fitness | osm_false_absence | 7.04 | - |
| Le Pain Quotidien | osm_false_absence | 1.29 | - |
| Lego | osm_false_absence | 1.43 | - |
| LensCrafters | osm_false_absence | 0.62 | - |
| Levi's | osm_false_absence | 1.30 | - |
| Lidl | osm_false_absence | 1.57 | - |
| Little Caesars | osm_false_absence | 5.29 | - |
| Lululemon | osm_false_absence | 0.88 | - |
| Lush | osm_false_absence | 0.92 | - |
| MAC Cosmetics | osm_false_absence | 1.21 | - |
| Macy's | osm_false_absence | 3.01 | - |
| Madewell | osm_false_absence | 1.13 | - |
| Marshalls | osm_false_absence | 0.97 | - |
| Massage Envy | osm_false_absence | 1.95 | - |
| Mattress Firm | osm_false_absence | 0.79 | - |
| McDonald's | osm_false_absence | 0.54 | - |
| Men's Wearhouse | osm_false_absence | 1.11 | - |
| Michael Kors | osm_false_absence | 3.43 | - |
| Michaels | osm_false_absence | 1.19 | - |
| Moe's Southwest Grill | osm_false_absence | 8.00 | - |
| Nike | osm_false_absence | 0.96 | - |
| Nordstrom | osm_false_absence | 0.41 | - |
| Old Navy | osm_false_absence | 0.97 | - |
| Orangetheory Fitness | osm_false_absence | 0.24 | - |
| Outback Steakhouse | osm_false_absence | 7.12 | - |
| P.F. Chang's | osm_false_absence | 0.90 | - |
| Panda Express | osm_false_absence | 1.68 | - |
| Panera Bread | osm_false_absence | 0.82 | - |
| Papa John's | osm_false_absence | 2.13 | - |
| Paper Source | osm_false_absence | 0.91 | - |
| Party City | osm_false_absence | 0.94 | - |
| Petco | osm_false_absence | 1.19 | - |
| PetSmart | osm_false_absence | 1.50 | - |
| Pizza Hut | osm_false_absence | 1.34 | - |
| Planet Fitness | osm_false_absence | 1.40 | - |
| Popeyes | osm_false_absence | 0.92 | - |
| Potbelly | osm_false_absence | 2.19 | - |
| Pottery Barn | osm_false_absence | 1.15 | - |
| Pret A Manger | osm_false_absence | 1.11 | - |
| Qdoba | osm_false_absence | 2.45 | - |
| Raising Cane's | osm_false_absence | 0.98 | - |
| Red Lobster | osm_false_absence | 6.88 | - |
| REI | osm_false_absence | 1.15 | - |
| Ross Dress for Less | osm_false_absence | 2.44 | - |
| Ruth's Chris Steak House | osm_false_absence | 2.93 | - |
| Sally Beauty | osm_false_absence | 0.89 | - |
| Sam's Club | osm_false_absence | 7.37 | - |
| Sephora | osm_false_absence | 0.77 | - |
| Skechers | osm_false_absence | 1.21 | - |
| Smashburger | osm_false_absence | 4.53 | - |
| Snap Fitness | osm_false_absence | 3.88 | - |
| solidcore | osm_false_absence | 0.40 | - |
| Sonic Drive-In | osm_false_absence | 6.20 | - |
| SoulCycle | osm_false_absence | 0.59 | - |
| Starbucks | osm_false_absence | 0.41 | - |
| Subway | osm_false_absence | 0.75 | - |
| Sunglass Hut | osm_false_absence | 0.62 | - |
| Sweetgreen | osm_false_absence | 0.67 | - |
| T-Mobile | osm_false_absence | 0.91 | - |
| Taco Bell | osm_false_absence | 0.54 | - |
| Talbots | osm_false_absence | 6.20 | - |
| Target | osm_false_absence | 1.06 | - |
| Tempur-Pedic | osm_false_absence | 4.31 | - |
| The Home Depot | osm_false_absence | 1.31 | - |
| The North Face | osm_false_absence | 1.03 | - |
| Tiffany & Co. | osm_false_absence | 1.08 | - |
| Tim Hortons | osm_false_absence | 5.14 | - |
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
| Burger King | osm_false_absence | 1.65 | - |
| Cava | osm_false_absence | 1.73 | - |
| Chipotle Mexican Grill | osm_false_absence | 1.16 | - |
| CorePower Yoga | osm_false_absence | 1.05 | - |
| Cost Plus World Market | osm_false_absence | 0.82 | - |
| Crunch Fitness | osm_false_absence | 2.00 | - |
| Dairy Queen | osm_false_absence | 2.85 | - |
| Dollar Tree | osm_false_absence | 4.34 | - |
| DSW | osm_false_absence | 1.39 | - |
| Dunkin' | osm_false_absence | 2.41 | - |
| Einstein Bros. Bagels | osm_false_absence | 1.56 | - |
| European Wax Center | osm_false_absence | 1.88 | - |
| F45 Training | osm_false_absence | 1.81 | - |
| Five Guys | osm_false_absence | 1.74 | - |
| HomeGoods | osm_false_absence | 1.44 | - |
| IHOP | osm_false_absence | 1.56 | - |
| Insomnia Cookies | osm_false_absence | 0.94 | - |
| J.Crew | osm_false_absence | 1.75 | - |
| J.Jill | osm_false_absence | 1.90 | - |
| Jamba | osm_false_absence | 2.17 | - |
| Jimmy John's | osm_false_absence | 2.35 | - |
| Kay Jewelers | osm_false_absence | 1.55 | - |
| LensCrafters | osm_false_absence | 1.82 | - |
| Little Caesars | osm_false_absence | 2.41 | - |
| Lululemon | osm_false_absence | 1.81 | - |
| Lush | osm_false_absence | 0.24 | - |
| Madewell | osm_false_absence | 1.90 | - |
| Marshalls | osm_false_absence | 1.64 | - |
| Mattress Firm | osm_false_absence | 1.57 | - |
| McDonald's | osm_false_absence | 2.79 | - |
| Men's Wearhouse | osm_false_absence | 1.65 | - |
| Michaels | osm_false_absence | 2.00 | - |
| Natural Grocers | osm_false_absence | 1.60 | - |
| Noodles & Company | osm_false_absence | 1.66 | - |
| Orangetheory Fitness | osm_false_absence | 1.82 | - |
| Panda Express | osm_false_absence | 1.88 | - |
| Panera Bread | osm_false_absence | 1.74 | - |
| Party City | osm_false_absence | 1.75 | - |
| Petco | osm_false_absence | 1.39 | - |
| PetSmart | osm_false_absence | 2.00 | - |
| Pizza Hut | osm_false_absence | 1.88 | - |
| Qdoba | osm_false_absence | 1.58 | - |
| Safeway | osm_false_absence | 1.55 | - |
| Sally Beauty | osm_false_absence | 1.35 | - |
| Sephora | osm_false_absence | 1.81 | - |
| solidcore | osm_false_absence | 1.35 | - |
| Sprouts Farmers Market | osm_false_absence | 1.31 | - |
| Starbucks | osm_false_absence | 1.17 | - |
| Subway | osm_false_absence | 1.24 | - |
| Sunglass Hut | osm_false_absence | 1.82 | - |
| Sweetgreen | osm_false_absence | 0.26 | - |
| T-Mobile | osm_false_absence | 1.68 | - |
| Taco Bell | osm_false_absence | 2.33 | - |
| Target | osm_false_absence | 1.80 | - |
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
