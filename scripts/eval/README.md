# Evaluation bundles

## Swap data without code changes

1. Record or copy a results JSON file under `packages/fixtures/src/eval/` (same shape as `strict-results.json`).
2. Set `resultsBundle` in `packages/fixtures/src/eval/manifest.json`.
3. Add `import yourBundle from './your-bundle.json'` and register it in `packages/fixtures/src/eval/load-bundle.ts` (`BUNDLES` map).
4. When the headline metric is chosen, set `headlineMetricId` to a catalog id from `metrics-catalog.ts`.

## Record pilot fixture sites

```bash
node scripts/strict-eval.mjs
QLOO_API_KEY=... node scripts/strict-eval.mjs
```

## Live API eval (25+ addresses)

Drop the recorded file (for example `live-eval-results.json`), point the manifest at it, and register it in `load-bundle.ts`. No UI or worker changes required if rows include `panels` or `siteMetrics` (panels are preferred for display).
