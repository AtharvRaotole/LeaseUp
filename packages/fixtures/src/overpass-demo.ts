import type { OverpassBrand } from './overpass-types';

/**
 * OSM hits near demo chips for batched prospect verification.
 * Source: apps/worker/src/__tests__/fixtures/overpass-*-synthetic.json
 * (Replace with live Overpass recordings when public endpoints are reachable.)
 */
export const overpassDemoByFixture: Record<
  'wicker' | 'boulder' | 'sevierville',
  { brands: OverpassBrand[] }
> = {
  "wicker": {
    "brands": [
      {
        "name": "Lululemon Athletica",
        "brand": "Lululemon",
        "brandWikidata": "Q6702226",
        "lat": 41.9095,
        "lon": -87.6785
      },
      {
        "name": "Apple Store",
        "brand": "Apple",
        "brandWikidata": "Q312",
        "lat": 41.911,
        "lon": -87.6755
      }
    ]
  },
  "boulder": {
    "brands": [
      {
        "name": "Whole Foods Market",
        "brand": "Whole Foods Market",
        "brandWikidata": "Q1809448",
        "lat": 40.018,
        "lon": -105.279
      },
      {
        "name": "Target",
        "brand": "Target",
        "brandWikidata": "Q1046951",
        "lat": 40.0165,
        "lon": -105.2815
      },
      {
        "name": "Starbucks",
        "brand": "Starbucks",
        "brandWikidata": "Q37158",
        "lat": 40.0195,
        "lon": -105.2765
      }
    ]
  },
  "sevierville": {
    "brands": [
      {
        "name": "Walmart Supercenter",
        "brand": "Walmart",
        "brandWikidata": "Q483551",
        "lat": 35.8695,
        "lon": -83.5635
      },
      {
        "name": "McDonald's",
        "brand": "McDonald's",
        "brandWikidata": "Q38076",
        "lat": 35.867,
        "lon": -83.5605
      }
    ]
  }
};
