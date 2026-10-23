import type { OverpassBrand } from './overpass-types';

/** Shown on demo prospects when no recorded Overpass file exists for the chip. */
export const DEMO_OSM_UNRECORDED_NOTE = 'OSM check not recorded for demo';

export interface OverpassDemoRecording {
  recordedAt: string;
  endpoint: string;
  query: string;
  brands: OverpassBrand[];
}

export const overpassDemoByFixture: Record<
  'wicker' | 'boulder' | 'sevierville',
  OverpassDemoRecording | null
> = {
  "wicker": {
    "recordedAt": "2026-10-23T03:36:58.860Z",
    "endpoint": "https://overpass-api.de/api/interpreter",
    "query": "[out:json][timeout:8];\n(\n  node[\"brand\"~\"^(Vans|Michael Kors|Under Armour|IKEA|Aerie|American Eagle Outfitters)$\",i](around:10000,41.9099418,-87.6772824);\n  way[\"brand\"~\"^(Vans|Michael Kors|Under Armour|IKEA|Aerie|American Eagle Outfitters)$\",i](around:10000,41.9099418,-87.6772824);\n  node[\"name\"~\"^(Vans|Michael Kors|Under Armour|IKEA|Aerie|American Eagle Outfitters)$\",i](around:10000,41.9099418,-87.6772824)[\"shop\"];\n  way[\"name\"~\"^(Vans|Michael Kors|Under Armour|IKEA|Aerie|American Eagle Outfitters)$\",i](around:10000,41.9099418,-87.6772824)[\"shop\"];\n  node[\"brand:wikidata\"~\"^(Q463871)$\"](around:10000,41.9099418,-87.6772824);\n  way[\"brand:wikidata\"~\"^(Q463871)$\"](around:10000,41.9099418,-87.6772824);\n);\nout center tags;",
    "brands": [
      {
        "name": "American Eagle Outfitters",
        "brand": "American Eagle Outfitters",
        "brandWikidata": "Q2842931",
        "lat": 41.9110306,
        "lon": -87.6537514
      },
      {
        "name": "Michael Kors",
        "brand": "Michael Kors",
        "brandWikidata": "Q134612138",
        "lat": 41.8994576,
        "lon": -87.6244883
      },
      {
        "name": "American Eagle Outfitters",
        "brand": "American Eagle Outfitters",
        "brandWikidata": "Q2842931",
        "lat": 41.8981233,
        "lon": -87.6229119
      },
      {
        "name": "Vans",
        "brand": "Vans",
        "brandWikidata": "Q1135366",
        "lat": 41.8912447,
        "lon": -87.6244777
      }
    ]
  },
  "boulder": {
    "recordedAt": "2026-10-23T03:39:17.080Z",
    "endpoint": "https://overpass-api.de/api/interpreter",
    "query": "[out:json][timeout:8];\n(\n  node[\"brand\"~\"^(Nike|Vans|Nordstrom|Victoria's Secret|Crumbl Cookies|Crumbl|Ulta|Kate Spade New York|Kate Spade|Pottery Barn|MAC Cosmetics|Williams-Sonoma)$\",i](around:10000,40.0179234,-105.2805434);\n  way[\"brand\"~\"^(Nike|Vans|Nordstrom|Victoria's Secret|Crumbl Cookies|Crumbl|Ulta|Kate Spade New York|Kate Spade|Pottery Barn|MAC Cosmetics|Williams-Sonoma)$\",i](around:10000,40.0179234,-105.2805434);\n  node[\"name\"~\"^(Nike|Vans|Nordstrom|Victoria's Secret|Crumbl Cookies|Crumbl|Ulta|Kate Spade New York|Kate Spade|Pottery Barn|MAC Cosmetics|Williams-Sonoma)$\",i](around:10000,40.0179234,-105.2805434)[\"shop\"];\n  way[\"name\"~\"^(Nike|Vans|Nordstrom|Victoria's Secret|Crumbl Cookies|Crumbl|Ulta|Kate Spade New York|Kate Spade|Pottery Barn|MAC Cosmetics|Williams-Sonoma)$\",i](around:10000,40.0179234,-105.2805434)[\"shop\"];\n);\nout center tags;",
    "brands": [
      {
        "name": "Crumbl Cookies",
        "brand": "Crumbl Cookies",
        "brandWikidata": "Q106924414",
        "lat": 40.018576,
        "lon": -105.256674
      }
    ]
  },
  "sevierville": {
    "recordedAt": "2026-10-23T03:37:03.657Z",
    "endpoint": "https://overpass-api.de/api/interpreter",
    "query": "[out:json][timeout:8];\n(\n  node[\"brand\"~\"^(Sephora|Whole Foods Market|Cost Plus World Market|Pottery Barn|MAC Cosmetics|Trader Joe's|Lush|Nordstrom|Michaels|Kohl's)$\",i](around:10000,35.8365438,-83.5589482);\n  way[\"brand\"~\"^(Sephora|Whole Foods Market|Cost Plus World Market|Pottery Barn|MAC Cosmetics|Trader Joe's|Lush|Nordstrom|Michaels|Kohl's)$\",i](around:10000,35.8365438,-83.5589482);\n  node[\"name\"~\"^(Sephora|Whole Foods Market|Cost Plus World Market|Pottery Barn|MAC Cosmetics|Trader Joe's|Lush|Nordstrom|Michaels|Kohl's)$\",i](around:10000,35.8365438,-83.5589482)[\"shop\"];\n  way[\"name\"~\"^(Sephora|Whole Foods Market|Cost Plus World Market|Pottery Barn|MAC Cosmetics|Trader Joe's|Lush|Nordstrom|Michaels|Kohl's)$\",i](around:10000,35.8365438,-83.5589482)[\"shop\"];\n);\nout center tags;",
    "brands": []
  }
};
