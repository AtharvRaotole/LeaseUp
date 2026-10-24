import { cohortExplainerHowRankedBody, cohortExplainerLimitsBody } from '@leaseup/fixtures';

/** Plain-language Qloo explainer for brokers (no em or en dashes in strings). */
export const QLOO_BROKER_EXPLAINER = {
  title: 'How LeaseUp uses Qloo',
  intro:
    'Qloo Taste AI scores how well each retail brand fits the people who shop near your address. LeaseUp uses those scores together with open store maps so you pitch brands that fit the trade area and are not already on the block.',
  sections: [
    {
      heading: 'What we ask Qloo for',
      body:
        'For your pin, LeaseUp calls Qloo brand insights: up to 227 tracked chains in batches, with the same radius you pick on the form (2, 5, or 10 km). The three demo addresses on the landing page use recorded answers so you can run a report without an API key.',
    },
    {
      heading: 'What P@10 means on our backtests',
      body:
        'P@10 is the share of the top 10 that already had a store in the trade area per All The Places and OpenStreetMap store checks in the study. It is not a signed lease and it is not a guarantee of open whitespace.',
    },
    {
      heading: 'How brands get ranked',
      body: cohortExplainerHowRankedBody(),
    },
    {
      heading: 'What we show on the report',
      body:
        'Trade area shoppers lists Qloo location tags as plain names (who shops here). The pitch list uses the blend ranking. Each row is checked against All The Places and, on demo chips, OpenStreetMap, so you see who may already lease nearby.',
    },
    {
      heading: 'Limits you should know',
      body: cohortExplainerLimitsBody(),
    },
    {
      heading: 'If Qloo is temporarily down',
      body:
        'Live mode can still return a report ranked by national chain size, with a clear banner that taste data was unavailable. Demo chips keep using recorded taste scores.',
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
