import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLiveQlooLiftAggregates } from '../eval/live-qloo-lift/load-aggregates.js';
import { loadResultsAdaptive } from '../eval/load-results-adaptive.js';
import { formatP10PercentRounded } from '../eval/cohort-eval-display.js';

const root = join(__dirname, '../../../..');

function p10RateTable(rate: number): string {
  return rate.toFixed(2);
}

describe('Qloo lift headline parity', () => {
  it('aggregates.json matches results_adaptive.json cohort means', () => {
    const agg = loadLiveQlooLiftAggregates();
    const adaptive = loadResultsAdaptive();
    expect(agg.rawQlooPrecisionAt10).toBeCloseTo(adaptive.agg.p10_raw, 6);
    expect(agg.chainSizePrecisionAt10).toBeCloseTo(adaptive.agg.p10_chain, 6);
    expect(agg.logisticBlendPrecisionAt10).toBeCloseTo(adaptive.agg.p10_blend, 6);
    expect(agg.sameSizeAuc.value).toBeCloseTo(adaptive.agg.same_size_auc, 6);
  });

  it('fixtures QLOO_LIFT_EVAL.md table rates match aggregates (.2f) and broker percents', () => {
    const agg = loadLiveQlooLiftAggregates();
    const md = readFileSync(
      join(root, 'packages/fixtures/src/eval/live-qloo-lift/QLOO_LIFT_EVAL.md'),
      'utf8'
    );
    expect(md).toContain(`| Raw Qloo P@10 | ${p10RateTable(agg.rawQlooPrecisionAt10)} |`);
    expect(md).toContain(`| Chain size P@10 | ${p10RateTable(agg.chainSizePrecisionAt10)} |`);
    expect(md).toContain(
      `| Logistic blend P@10 | ${p10RateTable(agg.logisticBlendPrecisionAt10)} |`
    );
    expect(md).toContain(String(agg.rawQlooPrecisionAt10));
    expect(md).toContain(String(agg.logisticBlendPrecisionAt10));
    expect(md).toContain(formatP10PercentRounded(agg.logisticBlendPrecisionAt10));
  });

  it('confirmed OSM-retile P@10 means (Oct 24, 2026 refresh)', () => {
    const agg = loadLiveQlooLiftAggregates();
    expect(agg.rawQlooPrecisionAt10).toBe(0.5375);
    expect(agg.chainSizePrecisionAt10).toBe(0.76);
    expect(agg.logisticBlendPrecisionAt10).toBe(0.825);
    expect(agg.logisticBlendLiftVsChainPp).toBe(6.5);
    expect(p10RateTable(agg.logisticBlendPrecisionAt10)).toBe('0.82');
    expect(formatP10PercentRounded(agg.logisticBlendPrecisionAt10)).toBe('83%');
  });
});
