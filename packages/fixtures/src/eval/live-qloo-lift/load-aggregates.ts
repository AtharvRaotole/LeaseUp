import { liveQlooLiftAggregates } from './aggregates-data.js';

export type LiveQlooLiftAggregates = typeof liveQlooLiftAggregates;

export function loadLiveQlooLiftAggregates(): LiveQlooLiftAggregates {
  return liveQlooLiftAggregates;
}
