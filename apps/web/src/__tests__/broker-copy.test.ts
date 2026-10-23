import { describe, it, expect } from 'vitest';
import { demoChipProofLabel, REPORT_PLAIN_SUMMARY } from '../lib/broker-copy';

describe('broker-copy', () => {
  it('uses the report plain summary without dashes', () => {
    expect(REPORT_PLAIN_SUMMARY).toContain('neighborhood shoppers');
    expect(REPORT_PLAIN_SUMMARY).not.toMatch(/[\u2013\u2014]/);
  });

  it('formats demo chip proof from fixture counts', () => {
    expect(demoChipProofLabel(9)).toBe('9 of 10 already nearby');
    expect(demoChipProofLabel(8, 'tied without taste')).toBe(
      '8 of 10 already nearby (tied without taste)'
    );
  });
});
