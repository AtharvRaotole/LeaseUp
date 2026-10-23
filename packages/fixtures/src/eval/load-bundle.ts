import type { EvalRunBundle } from './types.js';
import { getEvalManifest } from './present-metrics.js';
import strictResults from './strict-results.json';

/** Register additional bundles here when you add JSON files (see scripts/eval/README.md). */
const BUNDLES: Record<string, EvalRunBundle> = {
  'strict-results.json': strictResults as EvalRunBundle,
};

export function getEvalManifestRef() {
  return getEvalManifest();
}

export function loadEvalRunBundle(): EvalRunBundle {
  const manifest = getEvalManifest();
  const bundle = BUNDLES[manifest.resultsBundle];
  if (!bundle) {
    throw new Error(
      `Unknown eval results bundle "${manifest.resultsBundle}". Add it to eval/load-bundle.ts.`
    );
  }
  return bundle;
}
