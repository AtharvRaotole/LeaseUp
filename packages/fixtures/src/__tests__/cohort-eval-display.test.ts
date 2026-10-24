import { describe, expect, it } from 'vitest';
import {
  COHORT_EVAL_AGG,
  cohortBlendVsChainExactWithLift,
  formatP10PercentExact,
  formatP10PercentRounded,
} from '../eval/cohort-eval-display.js';

describe('cohortEvalDisplay', () => {
  it('distinguishes blend from chain in exact percents', () => {
    expect(formatP10PercentExact(COHORT_EVAL_AGG.p10_blend)).toBe('82.5%');
    expect(formatP10PercentExact(COHORT_EVAL_AGG.p10_chain)).toBe('76%');
    expect(formatP10PercentExact(COHORT_EVAL_AGG.p10_blend)).not.toBe(
      formatP10PercentExact(COHORT_EVAL_AGG.p10_chain)
    );
  });

  it('uses rounded marketing percents', () => {
    expect(formatP10PercentRounded(COHORT_EVAL_AGG.p10_blend)).toBe('83%');
    expect(formatP10PercentRounded(COHORT_EVAL_AGG.p10_raw)).toBe('54%');
  });

  it('includes lift in blend vs chain phrase', () => {
    expect(cohortBlendVsChainExactWithLift()).toMatch(/82\.5% vs 76% \(\+6\.5 pp\)/);
  });
});
