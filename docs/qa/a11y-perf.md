# Accessibility and mobile Lighthouse scores

## Measurement environments (do not mix)

| Environment | Stack | Lighthouse protocol | Used in |
|-------------|--------|---------------------|---------|
| **GitHub Actions `ubuntu-latest`** | Production `vite preview` (port **4173**) + demo worker (`APP_MODE=demo`, port **8787**), proxied `/api` | Mobile 390×844; **3 runs** per URL (`lighthouserc.cjs`); **median** per category | **Lighthouse CI** job in `.github/workflows/ci.yml` (`node scripts/run-lighthouse-ci.mjs`). Job log line `LHCI_MEDIANS:` prints raw performance arrays and medians after each run. |
| **GitHub Actions `ubuntu-latest`** | Same preview + demo worker as Lighthouse CI (ports **4180** / **8792** in `scripts/run-a11y-e2e.mjs`) | Axe via `@axe-core/playwright`, WCAG 2.x tags; map canvas excluded | **Axe a11y e2e** job |
| Optional local reproduction | `node scripts/run-report-lighthouse-benchmark.mjs` (custom ports) | 1 cold discard + **5** post-warm runs, 3s gap | Engineering only; **not** cited in Devpost or submission copy |

**Devpost / `SUBMISSION.md`:** cite only medians from the **GitHub Actions Lighthouse CI** row above, and state that environment explicitly. Never cite a higher score from a different machine, run count, or unmerged PR.

Mobile Lighthouse uses `formFactor: mobile` (390×844). Axe uses `@axe-core/playwright` with WCAG 2.x tags; map canvas controls are excluded.

## Axe (serious / critical violations)

Measured on **GitHub Actions `ubuntu-latest`** (Axe a11y e2e job, production preview + demo worker).

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

**Source:** GitHub Actions **Lighthouse CI** job, median of **three** mobile runs per URL (see table at top). Update the "After" column when a green CI run on the release branch prints a new `LHCI_MEDIANS:` line.

| URL | Before | After (GitHub Actions Lighthouse CI, median of 3 mobile runs) |
|-----|--------|------------------------------------------------------------------|
| `/` | 83 / 100 / 100 | See latest `LHCI_MEDIANS` for `http://localhost:4173/` (landing performance enforced ≥ 90 in CI) |
| `/r/wicker?…&radius=10` | 63 / 95 / 100 | See latest `LHCI_MEDIANS` for Wicker report URL (accessibility and best practices enforced ≥ 90; performance **warn** below 90) |

Report mobile work (#93+): demo-chip analyze **prefetch at app entry**, single-shot demo `/api/analyze`, lazy map column on mobile until Map tab, font preload, no mobile report enter animation, above-fold `brands-to-pitch`, post-paint deferral for all users (`requestAnimationFrame` ×2, then `requestIdleCallback`: mobile brand detail rows ~400ms idle, headline stats / sticky header / tour / demo banner 2.5s cap, deep sections 12s cap unless `?screenshot=1`)—no Lighthouse, headless, or audit detection.

**Smoke / e2e:** `data-testid="brands-to-pitch"` on the above-fold top-five card (`ReportSummaryAboveFold`); full list uses `brands-to-pitch-full-list`.

### Tour / audit honesty (PR #78 follow-up)

Re-checked `apps/web/src`: **no matches** for `lighthouse`, `HeadlessChrome`, `navigator.webdriver`, `LH_`, or audit-only env/query flags.

- Tour mounts when `deferPostPaint` is true (`ReportPage.tsx`, 2.5s idle cap).
- `?screenshot=1` expands deep sections for capture; it does **not** suppress the tour.
- E2e dismisses the tour in test setup (`e2e/a11y-helpers.ts`), not in production UI code.

CI: `node scripts/run-a11y-e2e.mjs` fails on new serious or critical axe violations. Lighthouse CI uses `lighthouserc.cjs` as above.
