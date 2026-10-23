# Accessibility and mobile Lighthouse scores

Measured locally on a **production Vite preview** (`vite preview`) with the **demo worker** (`APP_MODE=demo`, `127.0.0.1:8787` proxied as `/api`). Mobile Lighthouse uses `formFactor: mobile` (390×844). Axe uses `@axe-core/playwright` with WCAG 2.x tags; map canvas controls are excluded.

Command: `node scripts/run-a11y-perf-audit.mjs` (see `PLAYWRIGHT_BASE_URL` / `PLAYWRIGHT_API_URL`).

## Axe (serious / critical violations)

| Page | Before | After |
|------|--------|-------|
| Landing | 1 (`label-content-name-mismatch`) | 0 |
| Wicker report | 5 (`nested-interactive`) | 0 |
| Pitch pack | 0 | 0 |
| Pipeline | 0 | 0 |
| Watchlist | 0 | 0 |
| Methodology | 1 (`scrollable-region-focusable`) | 0 |
| 404 | 0 | 0 |

## Lighthouse mobile (Performance / Accessibility / Best practices)

| URL | Before | After |
|-----|--------|-------|
| `/` | 83 / 100 / 100 | 94 / 100 / 100 |
| `/r/wicker?…&radius=10` | 63 / 95 / 100 | 79 / 100 / 100 |

After scores are from the audit script after deferring fixtures and MapLibre on mobile report load, collapsing below-the-fold sections until opened, hero `fetchPriority="high"`, one font preload, `id="main-content"` on the report shell, larger buttons and info popovers, and a focusable skip link. Mobile report performance is still below the 90 target (79 in the last stable run); Lighthouse CI warns on report performance until that clears.

CI: `node scripts/run-a11y-e2e.mjs` fails on new serious or critical axe violations. Lighthouse CI uses `lighthouserc.cjs` (landing enforces 90+ on all three categories; report enforces 90+ on accessibility and best practices, performance at warn 90 until mobile report perf consistently clears 90).
