# False-absence sweep (verified missing-brand labels)

Generated: 2026-10-24T02:23:39.450Z

Top-10 prospects per site. A **false absence** is a prospect labeled **`verified (2 sources)`** as missing nearby while an OSM **brand:wikidata** cross-check (snapshot tiles + demo Overpass recordings + display aliases) finds a store within the analyze radius.

**Before** replays analyze with demo Overpass wikidata cross-check disabled (pre-fix). **After** is current code. At integration head after PR #89, the top-10 sweep is **0 → 0** because committed OSM snapshot tiles already downgrade in-radius stores (e.g. Crumbl@Boulder, AEO@Wicker); demo wikidata cross-check still guards demo mode when snapshot `hasBrandNearby` misses but recorded Overpass has a `brand:wikidata` hit. **350 Bleecker:** Qloo insights fixture is `nyc_williamsburg`; REI SoHo is covered by snapshot tiles + supplement (see `rei-bleecker-snapshot.test.ts`).

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Prospect rows (≤10 per site) | 25 | 25 |
| **False absence violations** | **0** | **0** |

_No false-absence violations after fix._
