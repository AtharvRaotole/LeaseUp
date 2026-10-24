# Devpost gallery (existing screenshots only)

Use these committed PNGs for the Devpost image gallery. Do **not** record new video or run `capture:devpost:local` until recording is authorized. Resize or crop to Devpost's 1600x1000 guidance in the upload UI if needed; paths below are the repo sources.

Production reference: integration branch `cursor/leaseup-v1-c429`, head `docs/devpost/integration-head.txt` (deploy32 on Cloudflare Pages tracks this branch).

| # | Feature | File | Caption (plain) |
| --- | --- | --- | --- |
| 1 | Landing + demo path | `docs/screenshots/landing-wicker-hero/light/1440/landing-hero-wicker.png` | Landing page with the Wicker Park demo preview beside the address form. Judges can open the same chip without an API key. |
| 2 | Summary-first report | `docs/screenshots/judge-1440/after/light/report-wicker.png` | Wicker report summary: headline stats, prospect funnel, and top brands to pitch on one screen. |
| 3 | Shared local audience | `docs/screenshots/co-tenancy-fallback/pitch-fallback-wicker-1440.png` | Pitch rows use `Shared local audience` only when the audience passes the brand top-5 affinity and local overlap gates (`qloo-brand-taste-overlap.ts`). |
| 4 | Official real-estate links | `docs/screenshots/judge-1440/after/light/demo-pitch.png` | Demo pitch pack with per-brand reach lines when `brand-real-estate.json` has a verified URL (13 brands today); otherwise a search fallback. |
| 5 | Nearest store honesty | `docs/screenshots/local-match-copy/light/report-wicker-pitch-rows-1440.png` | Pitch rows show reconciled nearest-store distance from All The Places and OpenStreetMap snapshot data, with broker-readable rank copy. |
| 6 | Address validation | `docs/screenshots/analyze-robustness/gibberish-1440.png` | Clear errors for bad addresses (gibberish, PO box, non-US, ambiguous text) before analyze runs (`address-input-validation.ts`). |
| 7 | Qloo-down fallback | `docs/screenshots/analyze-robustness/qloo-timeout-1440.png` | When taste insights fail, the report still ranks by chain size and shows the taste-unavailable banner (no fabricated Qloo scores). |

## Optional alternates

| Feature | File | Caption |
| --- | --- | --- |
| Boulder shared-audience row | `docs/screenshots/co-tenancy-fallback/pitch-fallback-boulder-1440.png` | Same audience fallback on the Pearl Street demo chip. |
| Mobile report | `docs/screenshots/mobile-polish/after/light/report-wicker.png` | Wicker report at phone width after the mobile polish pass. |
| Pipeline loop | `docs/screenshots/judge-1440/after/light/pipeline.png` | Pipeline board with saved evidence links back to the site report. |
| Methodology / eval | `docs/screenshots/methodology-eval-copy/light/1440/methodology-page.png` | Methodology page with eval-backed cohort numbers and definitions. |
| Qloo ranking proof | `docs/screenshots/features/report-qloo-proof-light-1440.png` | Compare ranking toggle and proof strip (83% vs 76% on the 40-address eval). |

## CI proof (no screenshot)

- **13** verified brand real-estate URLs: `scripts/check-brand-real-estate-urls.mjs`, `packages/fixtures/src/brand-real-estate.json`.
- **No false absences on four demo pins:** `apps/worker/src/__tests__/demo-chip-osm-absence-audit.test.ts`, `docs/DEMO_NEAREST_OSM_AUDIT.md`.
