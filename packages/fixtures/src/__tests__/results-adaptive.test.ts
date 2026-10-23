import { describe, expect, it } from 'vitest';
import {
  loadResultsAdaptive,
  findAdaptiveEvalRowByAddress,
  p10ToCountOf10,
} from '../eval/load-results-adaptive.js';

describe('results_adaptive.json', () => {
  it('matches committed cohort headline metrics', () => {
    const { agg } = loadResultsAdaptive();
    expect(agg.n_sites).toBe(40);
    expect(agg.p10_blend).toBeCloseTo(0.82, 2);
    expect(agg.p10_chain).toBeCloseTo(0.76, 2);
    expect(agg.p10_raw).toBeCloseTo(0.54, 2);
    expect(agg.same_size_auc).toBeCloseTo(0.672, 3);
  });

  it('includes Wicker dense-urban row at 1.5 km (9 vs 7 blend vs chain)', () => {
    const row = findAdaptiveEvalRowByAddress('1574 N Milwaukee Ave, Chicago, IL 60622');
    expect(row).toBeDefined();
    expect(row!.stratum).toBe('dense_urban');
    expect(row!.adaptive_radius_km).toBe(1.5);
    expect(p10ToCountOf10(row!.p10_blend)).toBe(9);
    expect(p10ToCountOf10(row!.p10_chain)).toBe(7);
    expect(row!.taste_percentile).toBe(64);
  });

  it.skip('has one row per study site (run sync-results-adaptive.mjs when study JSON is on disk)', () => {
    const { agg, per_address } = loadResultsAdaptive();
    expect(per_address.length).toBe(agg.n_sites);
  });
});
