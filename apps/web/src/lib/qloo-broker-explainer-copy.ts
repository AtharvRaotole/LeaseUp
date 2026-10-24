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
      heading: 'How brands get ranked',
      body:
        'Raw Qloo scores alone repeat similar lifestyle brands in every city. LeaseUp re-ranks with a taste blend that also uses national chain size and local density, fitted on our 40-address study. On that panel, raw Qloo top-10 presence was 54%, chain size alone 76%, and the blend 82%.',
    },
    {
      heading: 'What we show on the report',
      body:
        'Trade area shoppers lists Qloo location tags as plain names (who shops here). The pitch list uses the blend ranking. Each row is checked against All The Places and, on demo chips, OpenStreetMap, so you see who may already lease nearby.',
    },
    {
      heading: 'What we do not claim',
      body:
        'We do not say raw Qloo beats sorting by chain size on mean top-10 presence (54% vs 76% on the study). Qloo adds lift when you compare brands of similar size (same-size tier AUC 0.667 on 40 US addresses) and when blended with chain size. Presence in map data is not a signed lease.',
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
