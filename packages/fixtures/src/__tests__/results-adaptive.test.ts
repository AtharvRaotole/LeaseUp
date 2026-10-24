import { describe, expect, it } from 'vitest';
import {
  loadResultsAdaptive,
  findAdaptiveEvalRowByAddress,
  p10ToCountOf10,
} from '../eval/load-results-adaptive.js';
import {
  adaptiveEvalSiteDisplayLabel,
  isPurelyNumericSiteLabel,
} from '../eval/adaptive-eval-site-label.js';

describe('results_adaptive.json', () => {
  it('matches committed cohort headline metrics', () => {
    const { agg } = loadResultsAdaptive();
    expect(agg.n_sites).toBe(40);
    expect(agg.p10_blend).toBeCloseTo(0.825, 3);
    expect(agg.p10_chain).toBeCloseTo(0.76, 3);
    expect(agg.p10_raw).toBeCloseTo(0.5375, 3);
    expect(agg.same_size_auc).toBeCloseTo(0.664, 3);
  });

  it('includes Wicker dense-urban row at 1.5 km (9 vs 7 blend vs chain)', () => {
    const row = findAdaptiveEvalRowByAddress('1574 N Milwaukee Ave, Chicago, IL 60622');
    expect(row).toBeDefined();
    expect(row!.stratum).toBe('dense_urban');
    expect(row!.adaptive_radius_km).toBe(1.5);
    expect(p10ToCountOf10(row!.p10_blend)).toBe(9);
    expect(p10ToCountOf10(row!.p10_chain)).toBe(7);
    expect(row!.taste_percentile).toBe(54);
  });

  it('has one row per study site', () => {
    const { agg, per_address } = loadResultsAdaptive();
    expect(per_address.length).toBe(agg.n_sites);
    expect(agg.n_sites).toBe(40);
  });

  it('includes Boulder 1300 Pearl at 9 vs 8 blend vs chain', () => {
    const row = findAdaptiveEvalRowByAddress('1300 Pearl St, Boulder, CO 80302');
    expect(row).toBeDefined();
    expect(row!.eval_id).toBe('boulder_co');
    expect(p10ToCountOf10(row!.p10_blend)).toBe(9);
    expect(p10ToCountOf10(row!.p10_chain)).toBe(8);
  });

  it('uses street address and city for display labels (not numeric geocode junk)', () => {
    const athens = loadResultsAdaptive().per_address.find((r) => r.eval_id === 'athens_ga');
    expect(athens).toBeDefined();
    expect(adaptiveEvalSiteDisplayLabel(athens!)).toBe('200 E Clayton St, Athens');

    const austin = loadResultsAdaptive().per_address.find((r) => r.eval_id === 'austin_soco');
    expect(adaptiveEvalSiteDisplayLabel(austin!)).toBe('1400 S Congress Ave, Austin');
  });

  it('no adaptive eval site display label is purely numeric', () => {
    for (const row of loadResultsAdaptive().per_address) {
      const display = adaptiveEvalSiteDisplayLabel(row);
      expect(isPurelyNumericSiteLabel(display)).toBe(false);
    }
  });
});
