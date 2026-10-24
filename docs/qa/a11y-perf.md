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

**Source:** **GitHub Actions LHCI median of 3 mobile runs** on `ubuntu-latest` (production preview port 4173 + demo worker, `lighthouserc.cjs`). Raw arrays and medians are printed as `LHCI_MEDIANS:` in the job log after each run.

**Pinned from green CI** ([workflow run 40058723762](https://github.com/AtharvRaotole/LeaseUp/actions/runs/40058723762); re-measure on branch head and update when scores change):

| URL | Raw performance (3 runs) | Median (perf / a11y / best practices) |
|-----|--------------------------|----------------------------------------|
| `/` | 92, 93, 93 | **93** / 100 / 93 |
| `/r/wicker?…&radius=10` | 90, 92, 90 | **90** / 96 / 93 |

| URL | Before | After (same CI environment as above) |
|-----|--------|--------------------------------------|
| `/` | 83 / 100 / 100 | **93** / 100 / 93 |
| `/r/wicker?…&radius=10` | 63 / 95 / 100 | **90** / 96 / 93 |

Landing performance is enforced ≥ 90 in CI. Report performance is **warn-only** below 90 (median 90 in the run above). Report accessibility median **96** in that run (axe e2e still enforces 0 serious/critical on the report with `?screenshot=1`).

Report mobile work (#93+): demo-chip analyze **prefetch at app entry**, single-shot demo `/api/analyze`, lazy map column on mobile until Map tab, font preload, no mobile report enter animation, above-fold `brands-to-pitch`, post-paint deferral for all users (`requestAnimationFrame` ×2, then `requestIdleCallback`: mobile brand detail rows ~400ms idle, headline stats / sticky header / tour / demo banner 2.5s cap, deep sections 12s cap unless `?screenshot=1`)—no Lighthouse, headless, or audit detection.

**Smoke / e2e:** `data-testid="brands-to-pitch"` on the above-fold top-five card (`ReportSummaryAboveFold`); full list uses `brands-to-pitch-full-list`.

### Tour / audit honesty (PR #78 follow-up)

Re-checked `apps/web/src`: **no matches** for `lighthouse`, `HeadlessChrome`, `navigator.webdriver`, `LH_`, or audit-only env/query flags.

- Tour mounts when `deferPostPaint` is true (`ReportPage.tsx`, 2.5s idle cap).
- `?screenshot=1` expands deep sections for capture; it does **not** suppress the tour.
- E2e dismisses the tour in test setup (`e2e/a11y-helpers.ts`), not in production UI code.

CI: `node scripts/run-a11y-e2e.mjs` fails on new serious or critical axe violations. Lighthouse CI uses `lighthouserc.cjs` as above.
