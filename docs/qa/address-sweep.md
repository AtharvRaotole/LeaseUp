# Live address robustness sweep

**Production KV budget:** do not re-run against `leaseup-worker.issue-atharva.workers.dev` until after the daily KV reset (00:00 UTC). The sweep script defaults to `http://127.0.0.1:8787` and requires `ALLOW_LIVE_WORKER_QA=1` for production.

**Live calls on 2026-10-23:** **84** HTTP requests total (40× `/api/geocode` + 40× `/api/analyze` in the sweep, plus 4 manual debug curls). Offline recap: `pnpm qa:address-sweep --recap docs/qa/address-sweep.md` (add `--` before flags if using pnpm).

Worker: https://leaseup-worker.issue-atharva.workers.dev
Run at: 2026-10-23T19:50:52.659Z
Delay between analyze calls: 3500ms
Pass rate: **0/40 (0.0%)** with the first sweep script (false `store_beyond_radius` on every absent-brand row).

**Recount on this raw run (critical flags only): 10/40 (25.0%)** analyze HTTP 200.

**After geocode fixes in this PR (unit tests + Nominatim replay; not yet on live worker):** suite/range addresses geocode successfully; unfound addresses return 404 `GEOCODE_NOT_FOUND` instead of 500. Full analyze pass rate on live still dominated by Qloo **503** until #36 retry ships.

## Top issues (this run)

- http_503: 24
- http_500: 5
- geocode_internal: 7
- suspicious_category_world_market: 4
- http_502: 1

### Findings for other agents

- **bc-2041c19b**: picker shown on many close-score pairs; watch duplicate candidates in same ZIP.
- **bc-8baf732b**: `suspicious_category_world_market` on NYC, Miami, Minneapolis, Portland; verify dual-source rules for home/gift retailers.

### Worker fixes in this PR (re-run after deploy)

- Suite and address-range normalization before Nominatim structured search (Houston Galleria, Alberta range).
- `GEOCODE_NOT_FOUND` (404) instead of `INTERNAL_ERROR` (500) when Nominatim returns no candidates (PO Box, bad typos).
- Qloo `503` bursts during sweep: mitigated on integration branch via `fetchQlooWithRetry` (#36); live worker may still 503 under load until that deploy.

## Delegated to other agents

- Geocode picker dedupe and ZIP filtering: **bc-2041c19b**
- REI / Verified absent dual-source logic: **bc-8baf732b**

| ID | Input | Geo picker | Analyze | Latency (ms) | Brands | Resolved label | Issues | Notes |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| nyc_fifth | 611 5th Ave, New York, NY 10022 | true (2 cand.) | 200 | 7506 | 3 | 611 5th Avenue, Midtown East, New York, New York | store_beyond_radius, suspicious_category_world_market | big city flagship |
| la_melrose | 8401 Melrose Ave, Los Angeles, CA | false (1 cand.) | 200 | 13528 | 5 | 8401 Melrose Avenue, Fairfax, Los Angeles | store_beyond_radius | no ZIP |
| miami_lincoln | 901 Lincoln Rd, Miami Beach FL 33139 | false (1 cand.) | 200 | 12097 | 10 | 901 Lincoln Road, Miami Beach, Florida | store_beyond_radius, suspicious_category_world_market | missing comma before state |
| houston_galleria | 5085 Westheimer Rd Ste 2500, Houston, TX 77056 | null (null cand.) | 500 | 1420 | n/a |  | http_500, INTERNAL_ERROR | suite number |
| phoenix_biltmore | 2502 E Camelback Rd, Phoenix, AZ 85016 | true (3 cand.) | 502 | 8805 | n/a |  | http_502, UPSTREAM_ERROR | strip mall |
| dallas_northpark | 8687 N Central Expy, Dallas, TX 75225 | false (1 cand.) | 200 | 8822 | 2 | 8687 North Central Expressway, Dallas, Texas | store_beyond_radius | suburban mall |
| atlanta_lenox | 3393 Peachtree Rd NE, Atlanta, GA 30326 | false (1 cand.) | 200 | 9178 | 2 | 3393 Peachtree Road Northeast, Buckhead, Atlanta, Georgia | store_beyond_radius | NE suffix |
| boston_newbury | 800 Boylston St, Boston MA | true (2 cand.) | 200 | 9874 | 9 | 800 Boylston Street, Back Bay, Boston | store_beyond_radius | no ZIP |
| seattle_pike | 1520 4th Ave, Seattle, WA 98101 | false (1 cand.) | 200 | 10740 | 10 | 1520 4th Avenue, Central Business District, Seattle, Washington | store_beyond_radius | downtown |
| denver_cherry | 3000 E 1st Ave, Denver, CO 80206 | true (3 cand.) | 200 | 6648 | 10 | 3000 East 1st Avenue, Denver, Colorado | store_beyond_radius | not eval boulder |
| minneapolis_nicollet | 1000 Nicollet Mall, Minneapolis, MN 55403 | false (1 cand.) | 200 | 10884 | 10 | 1000 Nicollet Mall, Downtown West, Minneapolis | store_beyond_radius, suspicious_category_world_market | mall address |
| portland_powell | 3400 SE Powell Blvd, Portland, OR 97202 | false (1 cand.) | 200 | 9398 | 9 | 3400 Southeast Powell Boulevard, Creston-Kenilworth, Portland | store_beyond_radius, suspicious_category_world_market | suburban strip |
| nashville_broadway | 501 Broadway, Nashville, TN 37203 | false (1 cand.) | 503 | 2943 | n/a | 501 Broadway, Downtown Nashville, Nashville | http_503 | tourist strip |
| austin_south | 2901 S Lamar Blvd, Austin, TX 78704 | false (1 cand.) | 503 | 1752 | n/a | 2901 South Lamar Boulevard, Austin, Texas | http_503 | not eval austin reverse |
| charlotte_southpark | 4400 Sharon Rd, Charlotte, NC 28211 | false (1 cand.) | 503 | 1281 | n/a | 4400 Sharon Road, SouthPark, Charlotte, North Carolina | http_503 | suburban |
| tampa_international | 2223 N West Shore Blvd, Tampa, FL 33607 | true (2 cand.) | 503 | 1391 | n/a |  | http_503 | plaza |
| orlando_dr_phillips | 8001 S Orange Blossom Trl, Orlando, FL 32809 | false (1 cand.) | 503 | 1357 | n/a | 8001 South Orange Blossom Trail, Orlando, Florida | http_503 | trail abbr |
| sanantonio_river | 849 E Commerce St, San Antonio, TX 78205 | true (2 cand.) | 503 | 1981 | n/a |  | http_503 | downtown |
| columbus_polaris | 1500 Polaris Pkwy, Columbus, OH 43240 | false (1 cand.) | 503 | 1319 | n/a | 1500 Polaris Parkway, Columbus, Ohio | http_503 | parkway |
| indianapolis_keystone | 8702 Keystone Crossing, Indianapolis, IN 46240 | true (2 cand.) | 503 | 1755 | n/a |  | http_503 | crossing |
| kansas_countryclub | 400 W 47th St, Kansas City, MO 64112 | false (1 cand.) | 503 | 1078 | n/a | 400 West 47th Street, Plaza-Westport, Kansas City, Missouri | http_503 | midwest urban |
| stl_galleria | 1155 Saint Louis Galleria, Richmond Heights, MO 63117 | false (1 cand.) | 503 | 1633 | n/a | 1155 St Louis Galleria Street, Saint Louis, Missouri | http_503 | mall name in address |
| detroit_woodward | 1555 Broadway St, Detroit, MI 48226 | false (1 cand.) | 503 | 1298 | n/a | 1555 Broadway Street, Midtown, Detroit | http_503 | downtown |
| cleveland_rockside | 500 Rockside Rd, Independence, OH 44131 | null (null cand.) | 503 | 2315 | n/a |  | http_503 | suburban |
| pittsburgh_robison | 100 Robinson Centre Dr, Pittsburgh, PA 15205 | null (null cand.) | 500 | 1397 | n/a |  | http_500, INTERNAL_ERROR | centre spelling |
| philadelphia_market | 1600 Market St, Philadelphia, PA 19103 | false (1 cand.) | 503 | 2539 | n/a | 1600 Market Street, Rittenhouse Square, Philadelphia | http_503 | not eval walnut |
| baltimore_harbor | 601 E Pratt St, Baltimore, MD 21202 | true (2 cand.) | 503 | 566 | n/a |  | http_503 | harbor |
| dc_georgetown | 3276 M St NW, Washington, DC 20007 | false (1 cand.) | 503 | 1182 | n/a | 3276 M Street Northwest, Georgetown, Washington, District of Columbia | http_503 | NW quadrant |
| richmond_shortpump | 11800 W Broad St, Richmond, VA 23233 | true (2 cand.) | 503 | 1239 | n/a |  | http_503 | suburban |
| raleigh_cameron | 4325 Glenwood Ave, Raleigh, NC 27612 | false (1 cand.) | 503 | 1301 | n/a | 4325 Glenwood Avenue, Crabtree Valley, Raleigh, North Carolina | http_503 | not eval cary |
| jacksonville_town | 4872 Big Island Dr, Jacksonville, FL 32246 | false (1 cand.) | 503 | 1028 | n/a | 4872 Big Island Drive, Jacksonville | http_503 | town center |
| boise_boise | 350 N Milwaukee St, Boise, ID 83704 | true (2 cand.) | 503 | 1272 | n/a |  | http_503 | small city |
| omaha_regency | 120 Regency Pkwy, Omaha, NE 68114 | false (1 cand.) | 503 | 1402 | n/a | 120 Regency Parkway, Regency, Omaha | http_503 | suburban |
| albuquerque_coronado | 6600 Menaul Blvd NE, Albuquerque, NM 87110 | false (1 cand.) | 503 | 1439 | n/a | 6600 Menaul Boulevard Northeast, Vista Encantada, Albuquerque, New Mexico | http_503 | mall area |
| tucson_park | 4500 N Oracle Rd, Tucson, AZ 85705 | true (2 cand.) | 503 | 2301 | n/a |  | http_503 | strip |
| santafe_plaza | 60 E San Francisco St, Santa Fe, NM 87501 | false (1 cand.) | 503 | 1461 | n/a | 60 East San Francisco Street, Barrio de Analco Historic District, Santa Fe, New Mexico | http_503 | small town |
| burlington_church | 102 Church St, Burlington, VT 05401 | null (null cand.) | 503 | 2520 | n/a |  | http_503 | small city |
| range_portland | 1600-1630 NE Alberta St, Portland, OR 97211 | null (null cand.) | 500 | 1445 | n/a |  | http_500, INTERNAL_ERROR | address range |
| typo_chicago | 835 N Michgan Ave, Chcago, IL 60611 | null (null cand.) | 500 | 1658 | n/a |  | http_500, INTERNAL_ERROR | typos |
| po_style | PO Box 1200, Aspen, CO 81611 | null (null cand.) | 500 | 1441 | n/a |  | http_500, INTERNAL_ERROR | PO box style |

## Raw JSON

```json
{
  "summary": {
    "worker": "https://leaseup-worker.issue-atharva.workers.dev",
    "at": "2026-10-23T19:50:52.659Z",
    "total": 40,
    "pass": 0,
    "passRatePct": "0.0"
  },
  "results": [
    {
      "id": "nyc_fifth",
      "input": "611 5th Ave, New York, NY 10022",
      "notes": "big city flagship",
      "geocode": {
        "status": 200,
        "latencyMs": 2946,
        "needsConfirmation": true,
        "candidateCount": 2,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "611 5th Ave, New York, NY 10022",
          "latitude": 40.7580228,
          "longitude": -73.97695,
          "city": "New York",
          "neighborhood": "Midtown East",
          "resolvedAddress": "611 5th Avenue, Midtown East, New York, New York"
        }
      },
      "analyze": {
        "status": 200,
        "latencyMs": 7506,
        "code": null,
        "error": null,
        "brandCount": 3,
        "insightPool": null,
        "rankingCount": 224,
        "resolvedLabel": "611 5th Avenue, Midtown East, New York, New York",
        "candidates": null,
        "issues": [
          "store_beyond_radius",
          "suspicious_category_world_market"
        ],
        "mode": "live"
      },
      "pass": false
    },
    {
      "id": "la_melrose",
      "input": "8401 Melrose Ave, Los Angeles, CA",
      "notes": "no ZIP",
      "geocode": {
        "status": 200,
        "latencyMs": 2000,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "8401 Melrose Avenue, Fairfax, Los Angeles",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "8401 Melrose Ave, Los Angeles, CA",
          "latitude": 34.083191,
          "longitude": -118.374109,
          "city": "Los Angeles",
          "neighborhood": "Fairfax",
          "resolvedAddress": "8401 Melrose Avenue, Fairfax, Los Angeles"
        }
      },
      "analyze": {
        "status": 200,
        "latencyMs": 13528,
        "code": null,
        "error": null,
        "brandCount": 5,
        "insightPool": null,
        "rankingCount": 224,
        "resolvedLabel": "8401 Melrose Avenue, Fairfax, Los Angeles",
        "candidates": null,
        "issues": [
          "store_beyond_radius"
        ],
        "mode": "live"
      },
      "pass": false
    },
    {
      "id": "miami_lincoln",
      "input": "901 Lincoln Rd, Miami Beach FL 33139",
      "notes": "missing comma before state",
      "geocode": {
        "status": 200,
        "latencyMs": 1999,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "901 Lincoln Road, Miami Beach, Florida",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "901 Lincoln Rd, Miami Beach FL 33139",
          "latitude": 25.7906678,
          "longitude": -80.1378659,
          "city": "Miami Beach",
          "resolvedAddress": "901 Lincoln Road, Miami Beach, Florida"
        }
      },
      "analyze": {
        "status": 200,
        "latencyMs": 12097,
        "code": null,
        "error": null,
        "brandCount": 10,
        "insightPool": null,
        "rankingCount": 224,
        "resolvedLabel": "901 Lincoln Road, Miami Beach, Florida",
        "candidates": null,
        "issues": [
          "store_beyond_radius",
          "suspicious_category_world_market"
        ],
        "mode": "live"
      },
      "pass": false
    },
    {
      "id": "houston_galleria",
      "input": "5085 Westheimer Rd Ste 2500, Houston, TX 77056",
      "notes": "suite number",
      "geocode": {
        "status": 500,
        "latencyMs": 1768,
        "needsConfirmation": null,
        "candidateCount": null,
        "resolvedLabel": null,
        "code": "INTERNAL_ERROR",
        "error": "Internal Server Error",
        "confirmedLocation": null
      },
      "analyze": {
        "status": 500,
        "latencyMs": 1420,
        "code": "INTERNAL_ERROR",
        "error": "Internal Server Error",
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_500",
          "INTERNAL_ERROR"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "phoenix_biltmore",
      "input": "2502 E Camelback Rd, Phoenix, AZ 85016",
      "notes": "strip mall",
      "geocode": {
        "status": 200,
        "latencyMs": 2084,
        "needsConfirmation": true,
        "candidateCount": 3,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "2502 E Camelback Rd, Phoenix, AZ 85016",
          "latitude": 33.5106378,
          "longitude": -112.0263913,
          "city": "Phoenix",
          "neighborhood": "Biltmore Villas",
          "resolvedAddress": "2502 East Camelback Road, Biltmore Villas, Phoenix, Arizona"
        }
      },
      "analyze": {
        "status": 502,
        "latencyMs": 8805,
        "code": "UPSTREAM_ERROR",
        "error": "Qloo API fetch error",
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_502",
          "UPSTREAM_ERROR"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "dallas_northpark",
      "input": "8687 N Central Expy, Dallas, TX 75225",
      "notes": "suburban mall",
      "geocode": {
        "status": 200,
        "latencyMs": 2135,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "8687 North Central Expressway, Dallas, Texas",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "8687 N Central Expy, Dallas, TX 75225",
          "latitude": 32.8684768,
          "longitude": -96.7736477,
          "city": "Dallas",
          "resolvedAddress": "8687 North Central Expressway, Dallas, Texas"
        }
      },
      "analyze": {
        "status": 200,
        "latencyMs": 8822,
        "code": null,
        "error": null,
        "brandCount": 2,
        "insightPool": null,
        "rankingCount": 224,
        "resolvedLabel": "8687 North Central Expressway, Dallas, Texas",
        "candidates": null,
        "issues": [
          "store_beyond_radius"
        ],
        "mode": "live"
      },
      "pass": false
    },
    {
      "id": "atlanta_lenox",
      "input": "3393 Peachtree Rd NE, Atlanta, GA 30326",
      "notes": "NE suffix",
      "geocode": {
        "status": 200,
        "latencyMs": 1849,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "3393 Peachtree Road Northeast, Buckhead, Atlanta, Georgia",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "3393 Peachtree Rd NE, Atlanta, GA 30326",
          "latitude": 33.8466829,
          "longitude": -84.3628558,
          "city": "Atlanta",
          "neighborhood": "Buckhead",
          "resolvedAddress": "3393 Peachtree Road Northeast, Buckhead, Atlanta, Georgia"
        }
      },
      "analyze": {
        "status": 200,
        "latencyMs": 9178,
        "code": null,
        "error": null,
        "brandCount": 2,
        "insightPool": null,
        "rankingCount": 224,
        "resolvedLabel": "3393 Peachtree Road Northeast, Buckhead, Atlanta, Georgia",
        "candidates": null,
        "issues": [
          "store_beyond_radius"
        ],
        "mode": "live"
      },
      "pass": false
    },
    {
      "id": "boston_newbury",
      "input": "800 Boylston St, Boston MA",
      "notes": "no ZIP",
      "geocode": {
        "status": 200,
        "latencyMs": 1901,
        "needsConfirmation": true,
        "candidateCount": 2,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "800 Boylston St, Boston MA",
          "latitude": 42.3471718,
          "longitude": -71.0825069,
          "city": "Boston",
          "neighborhood": "Back Bay",
          "resolvedAddress": "800 Boylston Street, Back Bay, Boston"
        }
      },
      "analyze": {
        "status": 200,
        "latencyMs": 9874,
        "code": null,
        "error": null,
        "brandCount": 9,
        "insightPool": null,
        "rankingCount": 224,
        "resolvedLabel": "800 Boylston Street, Back Bay, Boston",
        "candidates": null,
        "issues": [
          "store_beyond_radius"
        ],
        "mode": "live"
      },
      "pass": false
    },
    {
      "id": "seattle_pike",
      "input": "1520 4th Ave, Seattle, WA 98101",
      "notes": "downtown",
      "geocode": {
        "status": 200,
        "latencyMs": 2268,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "1520 4th Avenue, Central Business District, Seattle, Washington",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "1520 4th Ave, Seattle, WA 98101",
          "latitude": 47.611022,
          "longitude": -122.3367461,
          "city": "Seattle",
          "neighborhood": "Central Business District",
          "resolvedAddress": "1520 4th Avenue, Central Business District, Seattle, Washington"
        }
      },
      "analyze": {
        "status": 200,
        "latencyMs": 10740,
        "code": null,
        "error": null,
        "brandCount": 10,
        "insightPool": null,
        "rankingCount": 224,
        "resolvedLabel": "1520 4th Avenue, Central Business District, Seattle, Washington",
        "candidates": null,
        "issues": [
          "store_beyond_radius"
        ],
        "mode": "live"
      },
      "pass": false
    },
    {
      "id": "denver_cherry",
      "input": "3000 E 1st Ave, Denver, CO 80206",
      "notes": "not eval boulder",
      "geocode": {
        "status": 200,
        "latencyMs": 2113,
        "needsConfirmation": true,
        "candidateCount": 3,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "3000 E 1st Ave, Denver, CO 80206",
          "latitude": 39.7166139,
          "longitude": -104.9524963,
          "city": "Denver",
          "resolvedAddress": "3000 East 1st Avenue, Denver, Colorado"
        }
      },
      "analyze": {
        "status": 200,
        "latencyMs": 6648,
        "code": null,
        "error": null,
        "brandCount": 10,
        "insightPool": null,
        "rankingCount": 224,
        "resolvedLabel": "3000 East 1st Avenue, Denver, Colorado",
        "candidates": null,
        "issues": [
          "store_beyond_radius"
        ],
        "mode": "live"
      },
      "pass": false
    },
    {
      "id": "minneapolis_nicollet",
      "input": "1000 Nicollet Mall, Minneapolis, MN 55403",
      "notes": "mall address",
      "geocode": {
        "status": 200,
        "latencyMs": 2162,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "1000 Nicollet Mall, Downtown West, Minneapolis",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "1000 Nicollet Mall, Minneapolis, MN 55403",
          "latitude": 44.9737893,
          "longitude": -93.2758321,
          "city": "Minneapolis",
          "neighborhood": "Downtown West",
          "resolvedAddress": "1000 Nicollet Mall, Downtown West, Minneapolis"
        }
      },
      "analyze": {
        "status": 200,
        "latencyMs": 10884,
        "code": null,
        "error": null,
        "brandCount": 10,
        "insightPool": null,
        "rankingCount": 224,
        "resolvedLabel": "1000 Nicollet Mall, Downtown West, Minneapolis",
        "candidates": null,
        "issues": [
          "store_beyond_radius",
          "suspicious_category_world_market"
        ],
        "mode": "live"
      },
      "pass": false
    },
    {
      "id": "portland_powell",
      "input": "3400 SE Powell Blvd, Portland, OR 97202",
      "notes": "suburban strip",
      "geocode": {
        "status": 200,
        "latencyMs": 2186,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "3400 Southeast Powell Boulevard, Creston-Kenilworth, Portland",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "3400 SE Powell Blvd, Portland, OR 97202",
          "latitude": 45.496771,
          "longitude": -122.629129,
          "city": "Portland",
          "neighborhood": "Creston-Kenilworth",
          "resolvedAddress": "3400 Southeast Powell Boulevard, Creston-Kenilworth, Portland"
        }
      },
      "analyze": {
        "status": 200,
        "latencyMs": 9398,
        "code": null,
        "error": null,
        "brandCount": 9,
        "insightPool": null,
        "rankingCount": 224,
        "resolvedLabel": "3400 Southeast Powell Boulevard, Creston-Kenilworth, Portland",
        "candidates": null,
        "issues": [
          "store_beyond_radius",
          "suspicious_category_world_market"
        ],
        "mode": "live"
      },
      "pass": false
    },
    {
      "id": "nashville_broadway",
      "input": "501 Broadway, Nashville, TN 37203",
      "notes": "tourist strip",
      "geocode": {
        "status": 200,
        "latencyMs": 2075,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "501 Broadway, Downtown Nashville, Nashville",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "501 Broadway, Nashville, TN 37203",
          "latitude": 36.1589806,
          "longitude": -86.7783819,
          "city": "Nashville",
          "neighborhood": "Downtown Nashville",
          "resolvedAddress": "501 Broadway, Downtown Nashville, Nashville"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 2943,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "austin_south",
      "input": "2901 S Lamar Blvd, Austin, TX 78704",
      "notes": "not eval austin reverse",
      "geocode": {
        "status": 200,
        "latencyMs": 2045,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "2901 South Lamar Boulevard, Austin, Texas",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "2901 S Lamar Blvd, Austin, TX 78704",
          "latitude": 30.2430666,
          "longitude": -97.782394,
          "city": "Austin",
          "resolvedAddress": "2901 South Lamar Boulevard, Austin, Texas"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1752,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "charlotte_southpark",
      "input": "4400 Sharon Rd, Charlotte, NC 28211",
      "notes": "suburban",
      "geocode": {
        "status": 200,
        "latencyMs": 2261,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "4400 Sharon Road, SouthPark, Charlotte, North Carolina",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "4400 Sharon Rd, Charlotte, NC 28211",
          "latitude": 35.1529082,
          "longitude": -80.8334511,
          "city": "Charlotte",
          "neighborhood": "SouthPark",
          "resolvedAddress": "4400 Sharon Road, SouthPark, Charlotte, North Carolina"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1281,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "tampa_international",
      "input": "2223 N West Shore Blvd, Tampa, FL 33607",
      "notes": "plaza",
      "geocode": {
        "status": 200,
        "latencyMs": 2147,
        "needsConfirmation": true,
        "candidateCount": 2,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "2223 N West Shore Blvd, Tampa, FL 33607",
          "latitude": 27.964542,
          "longitude": -82.5207208,
          "city": "Tampa",
          "neighborhood": "West Shore Estates",
          "resolvedAddress": "2223 North West Shore Boulevard, West Shore Estates, Tampa"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1391,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "orlando_dr_phillips",
      "input": "8001 S Orange Blossom Trl, Orlando, FL 32809",
      "notes": "trail abbr",
      "geocode": {
        "status": 200,
        "latencyMs": 2166,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "8001 South Orange Blossom Trail, Orlando, Florida",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "8001 S Orange Blossom Trl, Orlando, FL 32809",
          "latitude": 28.4446145,
          "longitude": -81.3917349,
          "city": "Orlando",
          "resolvedAddress": "8001 South Orange Blossom Trail, Orlando, Florida"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1357,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "sanantonio_river",
      "input": "849 E Commerce St, San Antonio, TX 78205",
      "notes": "downtown",
      "geocode": {
        "status": 200,
        "latencyMs": 2078,
        "needsConfirmation": true,
        "candidateCount": 2,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "849 E Commerce St, San Antonio, TX 78205",
          "latitude": 29.4246385,
          "longitude": -98.4849509,
          "city": "San Antonio",
          "neighborhood": "Hemisfair",
          "resolvedAddress": "849 East Commerce Street, Hemisfair, San Antonio, Texas"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1981,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "columbus_polaris",
      "input": "1500 Polaris Pkwy, Columbus, OH 43240",
      "notes": "parkway",
      "geocode": {
        "status": 200,
        "latencyMs": 2048,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "1500 Polaris Parkway, Columbus, Ohio",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "1500 Polaris Pkwy, Columbus, OH 43240",
          "latitude": 40.1444123,
          "longitude": -82.9824369,
          "city": "Columbus",
          "resolvedAddress": "1500 Polaris Parkway, Columbus, Ohio"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1319,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "indianapolis_keystone",
      "input": "8702 Keystone Crossing, Indianapolis, IN 46240",
      "notes": "crossing",
      "geocode": {
        "status": 200,
        "latencyMs": 1859,
        "needsConfirmation": true,
        "candidateCount": 2,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "8702 Keystone Crossing, Indianapolis, IN 46240",
          "latitude": 39.9145728,
          "longitude": -86.1103242,
          "city": "Indianapolis",
          "resolvedAddress": "8702 Keystone Crossing Boulevard, Indianapolis"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1755,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "kansas_countryclub",
      "input": "400 W 47th St, Kansas City, MO 64112",
      "notes": "midwest urban",
      "geocode": {
        "status": 200,
        "latencyMs": 2123,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "400 West 47th Street, Plaza-Westport, Kansas City, Missouri",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "400 W 47th St, Kansas City, MO 64112",
          "latitude": 39.0425195,
          "longitude": -94.591774,
          "city": "Kansas City",
          "neighborhood": "Plaza-Westport",
          "resolvedAddress": "400 West 47th Street, Plaza-Westport, Kansas City, Missouri"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1078,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "stl_galleria",
      "input": "1155 Saint Louis Galleria, Richmond Heights, MO 63117",
      "notes": "mall name in address",
      "geocode": {
        "status": 200,
        "latencyMs": 1828,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "1155 St Louis Galleria Street, Saint Louis, Missouri",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "1155 Saint Louis Galleria, Richmond Heights, MO 63117",
          "latitude": 38.6356793,
          "longitude": -90.3481344,
          "city": "Saint Louis",
          "resolvedAddress": "1155 St Louis Galleria Street, Saint Louis, Missouri"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1633,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "detroit_woodward",
      "input": "1555 Broadway St, Detroit, MI 48226",
      "notes": "downtown",
      "geocode": {
        "status": 200,
        "latencyMs": 1919,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "1555 Broadway Street, Midtown, Detroit",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "1555 Broadway St, Detroit, MI 48226",
          "latitude": 42.3360668,
          "longitude": -83.0494734,
          "city": "Detroit",
          "neighborhood": "Midtown",
          "resolvedAddress": "1555 Broadway Street, Midtown, Detroit"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1298,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "cleveland_rockside",
      "input": "500 Rockside Rd, Independence, OH 44131",
      "notes": "suburban",
      "geocode": {
        "status": 503,
        "latencyMs": 304,
        "needsConfirmation": null,
        "candidateCount": null,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": null
      },
      "analyze": {
        "status": 503,
        "latencyMs": 2315,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "pittsburgh_robison",
      "input": "100 Robinson Centre Dr, Pittsburgh, PA 15205",
      "notes": "centre spelling",
      "geocode": {
        "status": 500,
        "latencyMs": 2003,
        "needsConfirmation": null,
        "candidateCount": null,
        "resolvedLabel": null,
        "code": "INTERNAL_ERROR",
        "error": "Internal Server Error",
        "confirmedLocation": null
      },
      "analyze": {
        "status": 500,
        "latencyMs": 1397,
        "code": "INTERNAL_ERROR",
        "error": "Internal Server Error",
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_500",
          "INTERNAL_ERROR"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "philadelphia_market",
      "input": "1600 Market St, Philadelphia, PA 19103",
      "notes": "not eval walnut",
      "geocode": {
        "status": 200,
        "latencyMs": 2114,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "1600 Market Street, Rittenhouse Square, Philadelphia",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "1600 Market St, Philadelphia, PA 19103",
          "latitude": 39.9525367,
          "longitude": -75.1673271,
          "city": "Philadelphia",
          "neighborhood": "Rittenhouse Square",
          "resolvedAddress": "1600 Market Street, Rittenhouse Square, Philadelphia"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 2539,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "baltimore_harbor",
      "input": "601 E Pratt St, Baltimore, MD 21202",
      "notes": "harbor",
      "geocode": {
        "status": 200,
        "latencyMs": 2019,
        "needsConfirmation": true,
        "candidateCount": 2,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "601 E Pratt St, Baltimore, MD 21202",
          "latitude": 39.2860594,
          "longitude": -76.6071214,
          "city": "Baltimore",
          "neighborhood": "Inner Harbor",
          "resolvedAddress": "601 East Pratt Street, Inner Harbor, Baltimore"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 566,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "dc_georgetown",
      "input": "3276 M St NW, Washington, DC 20007",
      "notes": "NW quadrant",
      "geocode": {
        "status": 200,
        "latencyMs": 1896,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "3276 M Street Northwest, Georgetown, Washington, District of Columbia",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "3276 M St NW, Washington, DC 20007",
          "latitude": 38.9048919,
          "longitude": -77.0648266,
          "city": "Washington",
          "neighborhood": "Georgetown",
          "resolvedAddress": "3276 M Street Northwest, Georgetown, Washington, District of Columbia"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1182,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "richmond_shortpump",
      "input": "11800 W Broad St, Richmond, VA 23233",
      "notes": "suburban",
      "geocode": {
        "status": 200,
        "latencyMs": 2190,
        "needsConfirmation": true,
        "candidateCount": 2,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "11800 W Broad St, Richmond, VA 23233",
          "latitude": 37.6561375,
          "longitude": -77.619876,
          "city": "Richmond",
          "neighborhood": "Wellesley",
          "resolvedAddress": "11800 West Broad Street, Richmond, Virginia"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1239,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "raleigh_cameron",
      "input": "4325 Glenwood Ave, Raleigh, NC 27612",
      "notes": "not eval cary",
      "geocode": {
        "status": 200,
        "latencyMs": 2756,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "4325 Glenwood Avenue, Crabtree Valley, Raleigh, North Carolina",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "4325 Glenwood Ave, Raleigh, NC 27612",
          "latitude": 35.8404202,
          "longitude": -78.6800216,
          "city": "Raleigh",
          "neighborhood": "Crabtree Valley",
          "resolvedAddress": "4325 Glenwood Avenue, Crabtree Valley, Raleigh, North Carolina"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1301,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "jacksonville_town",
      "input": "4872 Big Island Dr, Jacksonville, FL 32246",
      "notes": "town center",
      "geocode": {
        "status": 200,
        "latencyMs": 1851,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "4872 Big Island Drive, Jacksonville",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "4872 Big Island Dr, Jacksonville, FL 32246",
          "latitude": 30.2539206,
          "longitude": -81.5297542,
          "city": "Jacksonville",
          "resolvedAddress": "4872 Big Island Drive, Jacksonville"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1028,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "boise_boise",
      "input": "350 N Milwaukee St, Boise, ID 83704",
      "notes": "small city",
      "geocode": {
        "status": 200,
        "latencyMs": 1758,
        "needsConfirmation": true,
        "candidateCount": 2,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "350 N Milwaukee St, Boise, ID 83704",
          "latitude": 43.6085837,
          "longitude": -116.278139,
          "city": "Boise",
          "resolvedAddress": "350 North Milwaukee Street, Boise, Idaho"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1272,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "omaha_regency",
      "input": "120 Regency Pkwy, Omaha, NE 68114",
      "notes": "suburban",
      "geocode": {
        "status": 200,
        "latencyMs": 1819,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "120 Regency Parkway, Regency, Omaha",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "120 Regency Pkwy, Omaha, NE 68114",
          "latitude": 41.259053,
          "longitude": -96.070282,
          "city": "Omaha",
          "neighborhood": "Regency",
          "resolvedAddress": "120 Regency Parkway, Regency, Omaha"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1402,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "albuquerque_coronado",
      "input": "6600 Menaul Blvd NE, Albuquerque, NM 87110",
      "notes": "mall area",
      "geocode": {
        "status": 200,
        "latencyMs": 2284,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "6600 Menaul Boulevard Northeast, Vista Encantada, Albuquerque, New Mexico",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "6600 Menaul Blvd NE, Albuquerque, NM 87110",
          "latitude": 35.1071269,
          "longitude": -106.5722559,
          "city": "Albuquerque",
          "neighborhood": "Vista Encantada",
          "resolvedAddress": "6600 Menaul Boulevard Northeast, Vista Encantada, Albuquerque, New Mexico"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1439,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "tucson_park",
      "input": "4500 N Oracle Rd, Tucson, AZ 85705",
      "notes": "strip",
      "geocode": {
        "status": 200,
        "latencyMs": 1849,
        "needsConfirmation": true,
        "candidateCount": 2,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "4500 N Oracle Rd, Tucson, AZ 85705",
          "latitude": 32.2892323,
          "longitude": -110.9745298,
          "city": "Tucson",
          "resolvedAddress": "4500 North Oracle Road, Tucson"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 2301,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "santafe_plaza",
      "input": "60 E San Francisco St, Santa Fe, NM 87501",
      "notes": "small town",
      "geocode": {
        "status": 200,
        "latencyMs": 2128,
        "needsConfirmation": false,
        "candidateCount": 1,
        "resolvedLabel": "60 East San Francisco Street, Barrio de Analco Historic District, Santa Fe, New Mexico",
        "code": null,
        "error": null,
        "confirmedLocation": {
          "address": "60 E San Francisco St, Santa Fe, NM 87501",
          "latitude": 35.6867768,
          "longitude": -105.9391489,
          "city": "Santa Fe",
          "neighborhood": "Barrio de Analco Historic District",
          "resolvedAddress": "60 East San Francisco Street, Barrio de Analco Historic District, Santa Fe, New Mexico"
        }
      },
      "analyze": {
        "status": 503,
        "latencyMs": 1461,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "burlington_church",
      "input": "102 Church St, Burlington, VT 05401",
      "notes": "small city",
      "geocode": {
        "status": 503,
        "latencyMs": 608,
        "needsConfirmation": null,
        "candidateCount": null,
        "resolvedLabel": null,
        "code": null,
        "error": null,
        "confirmedLocation": null
      },
      "analyze": {
        "status": 503,
        "latencyMs": 2520,
        "code": null,
        "error": null,
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_503"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "range_portland",
      "input": "1600-1630 NE Alberta St, Portland, OR 97211",
      "notes": "address range",
      "geocode": {
        "status": 500,
        "latencyMs": 1778,
        "needsConfirmation": null,
        "candidateCount": null,
        "resolvedLabel": null,
        "code": "INTERNAL_ERROR",
        "error": "Internal Server Error",
        "confirmedLocation": null
      },
      "analyze": {
        "status": 500,
        "latencyMs": 1445,
        "code": "INTERNAL_ERROR",
        "error": "Internal Server Error",
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_500",
          "INTERNAL_ERROR"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "typo_chicago",
      "input": "835 N Michgan Ave, Chcago, IL 60611",
      "notes": "typos",
      "geocode": {
        "status": 500,
        "latencyMs": 1605,
        "needsConfirmation": null,
        "candidateCount": null,
        "resolvedLabel": null,
        "code": "INTERNAL_ERROR",
        "error": "Internal Server Error",
        "confirmedLocation": null
      },
      "analyze": {
        "status": 500,
        "latencyMs": 1658,
        "code": "INTERNAL_ERROR",
        "error": "Internal Server Error",
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_500",
          "INTERNAL_ERROR"
        ],
        "mode": null
      },
      "pass": false
    },
    {
      "id": "po_style",
      "input": "PO Box 1200, Aspen, CO 81611",
      "notes": "PO box style",
      "geocode": {
        "status": 500,
        "latencyMs": 2116,
        "needsConfirmation": null,
        "candidateCount": null,
        "resolvedLabel": null,
        "code": "INTERNAL_ERROR",
        "error": "Internal Server Error",
        "confirmedLocation": null
      },
      "analyze": {
        "status": 500,
        "latencyMs": 1441,
        "code": "INTERNAL_ERROR",
        "error": "Internal Server Error",
        "brandCount": null,
        "insightPool": null,
        "rankingCount": null,
        "resolvedLabel": null,
        "candidates": null,
        "issues": [
          "http_500",
          "INTERNAL_ERROR"
        ],
        "mode": null
      },
      "pass": false
    }
  ]
}
```
