# Full visual QA pass (offline demo stack)

Captured with `node scripts/full-visual-qa-pass.mjs` against local `APP_MODE=demo` worker and Vite preview (no deployed URLs).

## Matrices

- Viewports: **390** and **1440**
- Themes: **light** and **dark**
- Surfaces: landing, report (1125 Pearl St), brand, brand detail, portfolio, pitch, pipeline, watchlist diff preview, methodology, 404

## Bleecker report

`350 Bleecker St` is not a recorded Qloo demo chip today; `report-bleecker-*` shots may show the demo-mode error state. OSM/REI coverage for Bleecker is covered by worker integration tests, not this UI matrix.

## Regenerate

```bash
node scripts/full-visual-qa-pass.mjs
VQA_OUT=docs/screenshots/visual-qa-pass/after CAPTURE_ONLY=1 node scripts/full-visual-qa-pass.mjs
```

`CAPTURE_ONLY=1` requires an already-running demo worker and preview with `VITE_API_URL` set to the preview origin.

## Highlights (PR)

Before/after pairs for the highest-signal fixes live under `highlights/before` and `highlights/after` (landing hero overflow, Pearl report, pipeline mobile).

## Not fixed in this pass

- **350 Bleecker full report**: demo mode only ships three home-page addresses; Bleecker screenshots document the error/empty state until a recorded fixture exists.
- **Pipeline kanban**: columns scroll horizontally inside the board on narrow viewports by design (page-level overflow is still checked).
