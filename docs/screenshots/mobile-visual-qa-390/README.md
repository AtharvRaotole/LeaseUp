# Mobile visual QA (390px)

Captured with `node scripts/mobile-visual-qa-390.mjs` against the local demo worker and Vite preview (`VITE_API_URL` = preview origin).

## Matrices

- Viewport: **390×844**
- Themes: **light** and **dark**
- Surfaces: landing, Wicker / Boulder / Sevierville reports, brand detail, portfolio, pipeline (seeded), methodology, watchlist, demo Boulder pitch, API-generated Wicker pitch

## 350 Bleecker report

Demo mode only records Qloo insights for the three home-page chips. `report-bleecker-*` captures the confirmed-pin URL and documents the demo-mode limitation (error banner) until a recorded fixture exists. REI/OSM coverage for Bleecker is covered in worker integration tests.

## Regenerate

```bash
node scripts/mobile-visual-qa-390.mjs
VQA_OUT=docs/screenshots/mobile-visual-qa-390/after CAPTURE_ONLY=1 node scripts/mobile-visual-qa-390.mjs
```
