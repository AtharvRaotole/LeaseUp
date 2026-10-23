import { describe, it, expect } from 'vitest';
import { demoChipPresentInTop10, demoChipHitRateLabel } from '@leaseup/fixtures';

describe('demo chip hit rates', () => {
  it('match fixture backtests at 10 km', () => {
    expect(demoChipPresentInTop10('wicker')).toBe(10);
    expect(demoChipPresentInTop10('boulder')).toBe(8);
    expect(demoChipPresentInTop10('sevierville')).toBe(9);
    expect(demoChipHitRateLabel('sevierville')).toBe('Hit rate 9 of 10');
  });
});
