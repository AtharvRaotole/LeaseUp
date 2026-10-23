# Accessibility and mobile Lighthouse scores

Measured locally on a **production Vite preview** (`vite preview`) with the **demo worker** (`APP_MODE=demo`, `127.0.0.1:8787` proxied as `/api`). Mobile Lighthouse uses `formFactor: mobile` (390×844). Axe uses `@axe-core/playwright` with WCAG 2.x tags; map canvas controls are excluded.

Command: `node scripts/run-a11y-perf-audit.mjs` (see `PLAYWRIGHT_BASE_URL` / `PLAYWRIGHT_API_URL`). Lighthouse scores discard one cold navigation per URL, then record the next run (landing) or median of three runs (report).

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
| `/` | 83 / 100 / 100 | 93 / 100 / 100 |
| `/r/wicker?…&radius=10` | 63 / 95 / 100 | 88 / 100 / 100 (84–89 typical) |

After scores follow PR #71 (axe + Lighthouse pass) plus report mobile work: demo analyze prefetch from `main.tsx`, single-shot demo `/api/analyze` (no SSE) for demo chips, `ReportDeepSections` with lazy below-the-fold modules, map column lazy-loaded, 24×24px info tooltip targets, and no first-run tour on mobile (avoids layout shift in Lighthouse). Landing and report accessibility and best practices are at 100; mobile report performance is improved (~79 → ~88) but still slightly below the 90 goal on simulated mobile throttling.

CI: `node scripts/run-a11y-e2e.mjs` fails on new serious or critical axe violations. Lighthouse CI uses `lighthouserc.cjs` (three runs per URL; landing enforces 90+ on all three categories; report enforces 90+ on accessibility and best practices, performance at **warn** 90 until mobile report performance consistently clears 90).
