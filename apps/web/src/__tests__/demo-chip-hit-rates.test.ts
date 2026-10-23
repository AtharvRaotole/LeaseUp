import { describe, it, expect } from 'vitest';
import {
  demoChipPresentInTop10,
  demoChipHitRateLabel,
  demoChipProofHitRateLabel,
  demoChipIdsByQlooLift,
  demoChipQlooProof,
} from '@leaseup/fixtures';

describe('demo chip hit rates', () => {
  it('match fixture backtests at 10 km', () => {
    expect(demoChipPresentInTop10('wicker')).toBe(10);
    expect(demoChipPresentInTop10('boulder')).toBe(8);
    expect(demoChipPresentInTop10('sevierville')).toBe(9);
    expect(demoChipHitRateLabel('sevierville')).toBe('Hit rate 9 of 10');
    expect(demoChipProofHitRateLabel('boulder')).toBe(
      'Hit rate 8 of 10 (tied without taste)'
    );
  });

  it('orders demo chips by honest Qloo lift', () => {
    expect(demoChipIdsByQlooLift()).toEqual(['wicker', 'boulder', 'sevierville']);
    expect(demoChipQlooProof('boulder').lift).toBe(0);
  });
});
