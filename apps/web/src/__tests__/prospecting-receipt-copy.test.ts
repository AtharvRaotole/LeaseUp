import { describe, expect, it } from 'vitest';
import type { ProspectingStep } from '@leaseup/contracts';
import { receiptStepLabel, receiptStepResult } from '../lib/prospecting-receipt-copy';
import { DEMO_PROSPECTING_RECEIPT_JOB } from '../lib/demo-prospecting-receipt-fixture';

describe('prospecting receipt copy', () => {
  const job = DEMO_PROSPECTING_RECEIPT_JOB;

  it('rewrites analysis step labels for brokers', () => {
    expect(receiptStepLabel({ id: 'verify_osm', label: 'Double-check absence (ATP + OSM)', status: 'complete' })).toBe(
      'Check stores in two directories'
    );
    expect(receiptStepLabel({ id: 'rank_backtest', label: 'Prove it (backtest)', status: 'complete' })).toBe(
      'Rank and back-test'
    );
  });

  it('replaces coordinate taste summaries with the street area', () => {
    const step: ProspectingStep = {
      id: 'taste',
      label: "Read the neighborhood's taste (Qloo)",
      status: 'complete',
      summary: '224 brands ranked for 41.9099418,-87.6772824 (10km)',
    };
    expect(receiptStepResult(step, job)).toBe('224 brands ranked for Wicker Park (10 km trade area)');
  });

  it('pluralizes verify directory copy', () => {
    expect(receiptStepResult(
      { id: 'verify_osm', label: 'Verify', status: 'complete', summary: '5 single source' },
      job
    )).toBe('5 brands checked in one directory only');
    expect(receiptStepResult(
      { id: 'verify_osm', label: 'Verify', status: 'complete', summary: '1 single source' },
      job
    )).toBe('1 brand checked in one directory only');
  });

  it('honestly describes a small-sample 10/10 backtest', () => {
    const step: ProspectingStep = {
      id: 'rank_backtest',
      label: 'Prove it (backtest)',
      status: 'complete',
      summary: 'Raw P@10 100% · Blended P@10 100%',
      detail: {
        adaptiveRadiusKm: 3,
        rawPresentInTop10: 10,
        blendedPresentInTop10: 10,
        randomExpectedPresentAt10: 0.8,
      },
    };
    expect(receiptStepResult(step, job)).toContain('Small local opening sample');
    expect(receiptStepResult(step, job)).not.toMatch(/P@10/);
  });
});
