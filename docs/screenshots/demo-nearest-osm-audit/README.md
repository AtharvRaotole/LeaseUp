# Demo nearest-store OSM reconciliation

See `docs/DEMO_NEAREST_OSM_AUDIT.md` for the audit write-up.

CI guard: `apps/worker/src/__tests__/demo-chip-osm-absence-audit.test.ts`.

REI SoHo at 350 Bleecker: OSM snapshot nearest is about **1.1 to 2 km** (`rei-bleecker-tiles.integration.test.ts`), not the ATP-only **25+ km** false absence.
