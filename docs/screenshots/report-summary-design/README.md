# Report summary design pass (Boulder Pearl demo)

Above-fold `report-summary` (headline stats + top five brands) at **390** and **1440**, light and dark.

```bash
node scripts/report-summary-design-screenshots.mjs --phase before
node scripts/report-summary-design-screenshots.mjs --phase after
```

Uses local `APP_MODE=demo` worker and Vite preview (`VITE_API_URL` = preview origin at build time).
