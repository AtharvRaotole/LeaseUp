# Geocode confirm picker (offline demo)

`bleecker-picker-390.png`: 350 Bleecker ambiguous geocode at 390px width after MapLibre `resize()` / `ResizeObserver` fix.

Regenerate (demo worker + preview with `CSP_E2E_WORKER_PORT` matching worker, `VITE_API_URL` = preview origin at build):

```bash
SCREENSHOT_BASE=http://127.0.0.1:4182 node scripts/geocode-fix-screenshots.mjs
```
