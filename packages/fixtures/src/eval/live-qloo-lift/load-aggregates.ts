import aggregates from './aggregates.json' with { type: 'json' };

export type LiveQlooLiftAggregates = typeof aggregates;

export function loadLiveQlooLiftAggregates(): LiveQlooLiftAggregates {
  return aggregates;
}
