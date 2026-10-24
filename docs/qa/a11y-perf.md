# Accessibility and mobile Lighthouse scores

Measured locally on a **production Vite preview** (`vite preview`) with the **demo worker** (`APP_MODE=demo`, `127.0.0.1:8787` proxied as `/api`). Mobile Lighthouse uses `formFactor: mobile` (390×844). Axe uses `@axe-core/playwright` with WCAG 2.x tags; map canvas controls are excluded.

Commands:

- Full axe + Lighthouse sweep: `node scripts/run-a11y-perf-audit.mjs` (see `PLAYWRIGHT_BASE_URL` / `PLAYWRIGHT_API_URL`). Landing uses one cold discard then the next run; report uses the **median of three** post-warm runs in that script.
- **Report mobile performance benchmark (authoritative for the Wicker report):** `node scripts/run-report-lighthouse-benchmark.mjs` — production build, demo worker, one cold discard, then **five** post-warm runs with **3s** between runs; scores below use the **median** of those five.

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
| `/` | 83 / 100 / 100 | 91 / 100 / 100 |
| `/r/wicker?…&radius=10` | 63 / 95 / 100 | **67** / 100 / 100 |

After scores follow PR #71 plus report mobile work (#93 and follow-up): demo-chip analyze **prefetch at app entry**, single-shot demo `/api/analyze`, lazy map column (mobile report pane skips map until the user opens Map), font preload for body and display weights, **no** mobile enter animation on report content, above-fold `brands-to-pitch`, and **post-paint deferral** for all users (`requestAnimationFrame` ×2, then `requestIdleCallback`: mobile brand one-line reasons and per-row pipeline CTAs after ~400ms idle, headline stats / sticky header / tour / demo banner at 2.5s cap, deep sections at 12s cap)—no Lighthouse, headless, or audit detection.

**Wicker report mobile performance (five-run median, 2026-10-24):**

| Commit / state | Raw performance (5 post-warm runs) | Median |
|--------------|-----------------------------------|--------|
| `fce312c` (#93 merge) | 91, 66, 67, 66, 66 | **66** |
| Current (`cursor/report-lh-remeasure-ca63`) | 67, 71, 67, 67, 71 | **67** |

PR #93 briefly claimed a median of **90** from three runs; the five-run protocol above does not reproduce that figure. Accessibility and best practices are 100 on landing and report.

**Smoke / e2e:** `data-testid="brands-to-pitch"` lives on the above-fold top-five card (`ReportSummaryAboveFold`); the full list in the collapsible section uses `brands-to-pitch-full-list`.

### Tour / audit honesty (PR #78 follow-up)

Re-checked `apps/web/src` after merging broker comprehension (#83): **no matches** for `lighthouse`, `HeadlessChrome`, `navigator.webdriver`, `LH_`, or audit-only env/query flags. Nothing in app code skips or changes the first-run tour for Lighthouse, headless Chrome, or Playwright.

- Tour timing for **all** users (including mobile): `ReportPage.tsx` sets `deferPostPaint` after double `requestAnimationFrame` plus idle/timeout (2.5s cap), then mounts `ReportFirstRunTour` when `deferPostPaint` is true.
- `?screenshot=1` only expands deep sections and adds `html.screenshot-capture` for capture scripts (`ReportPage.tsx`); it does **not** suppress the tour.
- E2e and Lighthouse CI dismiss the tour in **test setup** (`e2e/a11y-helpers.ts`, `e2e/usability.spec.ts`), not in production UI code.

CI: `node scripts/run-a11y-e2e.mjs` fails on new serious or critical axe violations. Lighthouse CI uses `lighthouserc.cjs` (three runs per URL; landing enforces 90+ on all three categories; report enforces 90+ on accessibility and best practices, performance at **warn** 90 until mobile report performance consistently clears 90).
