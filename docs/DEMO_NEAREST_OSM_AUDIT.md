# Demo chip nearest-store OSM reconciliation audit

Generated as part of the false-positive nearest-store work (integration `a440a28`).

## Problem

All The Places (ATP) store extracts can miss metro locations that exist in the committed OpenStreetMap snapshot (`brand:wikidata` tiles). Example: REI at **350 Bleecker St** showed a nearest store near **25.5 km** while REI SoHo is about **2 km** in OSM snapshot data.

## Fix

- `reconcileNearestStoreKm()` uses the **closer** of ATP and OSM snapshot distances (50 km scan).
- When ATP and OSM disagree by **2 km or more**, `nearestExistingStoreUnconfirmed` is set and UI copy says distance is unconfirmed.
- `stripFalseAbsenceReasons()` removes "No X store within Y km" reason lines when reconciled nearest is inside the prospect absence radius.

## CI guard

`apps/worker/src/__tests__/demo-chip-osm-absence-audit.test.ts` runs analyze for:

- Wicker (`1560 N Milwaukee`)
- Boulder (`1300 Pearl St`)
- Sevierville (`125 Collier Dr`)
- 350 Bleecker St (Williamsburg insights fixture)

For each top-10 prospect, it fails if OSM snapshot ground truth shows a store **inside the absence radius** but the report still claims ATP-style absence or reports a nearest distance farther than OSM.

## Data sources (repo only)

- OSM snapshot tiles under `data/osm-snapshot/tiles/` and `apps/worker/public/osm-tiles/`
- ATP expanded locations `data/brands/store-locations.expanded.min.json`
- Store supplements `data/store-location-supplements.json`
- Ground-truth helper: `loadStoreGroundTruthCatalog()` in `false-positive-prospect-audit.ts`
