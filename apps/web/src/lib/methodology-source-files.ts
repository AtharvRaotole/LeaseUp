/** Repo paths for auditors; shown in the methodology page Source files block only. */
export const METHODOLOGY_SOURCE_FILES: { label: string; path: string }[] = [
  { label: 'Strict eval runner (demo chips)', path: 'scripts/strict-eval.mjs' },
  { label: '40-site adaptive-radius results', path: 'packages/fixtures/src/eval/results_adaptive.json' },
  { label: 'Per-metric table notes', path: 'packages/fixtures/src/eval/tables.md' },
  {
    label: 'Qloo lift study write-up',
    path: 'packages/fixtures/src/eval/live-qloo-lift/QLOO_LIFT_EVAL.md',
  },
  {
    label: 'Live Qloo lift results bundle',
    path: 'packages/fixtures/src/eval/live-qloo-lift/live-qloo-lift-results.json',
  },
];
