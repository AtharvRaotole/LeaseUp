/** Plain-language Qloo explainer for brokers (no em or en dashes in strings). */
export const QLOO_BROKER_EXPLAINER = {
  title: 'How LeaseUp uses Qloo',
  intro:
    'Qloo Taste AI scores how well each retail brand fits the people who shop near your address. LeaseUp uses those scores together with open store maps so you pitch brands that fit the trade area and are not already on the block.',
  sections: [
    {
      heading: 'What we ask Qloo for',
      body:
        'For your pin, LeaseUp calls Qloo brand insights: up to 227 tracked chains in batches, with the same radius you pick on the form (2, 5, or 10 km). Demo chips use recorded answers so judges can try the product without an API key.',
    },
    {
      heading: 'What P@10 means on our backtests',
      body:
        'P@10 is the share of the top 10 that already had a store in the trade area per ATP and OSM in the study. It is not a signed lease and it is not a guarantee of open whitespace.',
    },
    {
      heading: 'How brands get ranked',
      body:
        'Raw Qloo scores alone repeat similar lifestyle brands in every city and do not beat sorting by chain size on mean P@10 (54% vs 76% on 40 US addresses). LeaseUp ships a fitted taste blend (82% vs 76%) and highlights lift when you order within a chain-size tier (for example mid-size P@5 53% vs 23%).',
    },
    {
      heading: 'What we show on the report',
      body:
        'Trade area shoppers lists Qloo location tags as plain names (who shops here). The pitch list uses the blend ranking. Each row is checked against All The Places and, on demo chips, OpenStreetMap, so you see who may already lease nearby.',
    },
    {
      heading: 'What we do not claim',
      body:
        'We do not say raw Qloo beats chain size on mean P@10. Lift comes from the blend and from mid-size tier ordering, plus the same-size tier AUC 0.667 study metric. Store checks can miss locations absent from both ATP and OSM; after the PR #89 false-positive audit we removed all 4 known false positives across 13 test sites, but we never say zero false positives because OSM covers only 25 of 227 tracked chains on demo chips.',
    },
    {
      heading: 'Where the numbers live',
      body:
        'Full methodology, confidence intervals, and address tables are on the methodology page and in the repo eval files linked below.',
    },
  ],
  evalLinks: [
    { label: '40-address write-up', path: 'data/qloo-eval-40/QLOO_LIFT_EVAL.md' },
    { label: 'Committed cohort metrics', path: 'packages/fixtures/src/eval/live-qloo-lift/aggregates.json' },
    { label: 'Per-address adaptive table', path: 'packages/fixtures/src/eval/results_adaptive.json' },
  ],
} as const;
