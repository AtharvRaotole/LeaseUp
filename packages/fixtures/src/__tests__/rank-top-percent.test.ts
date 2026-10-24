import { describe, it, expect } from 'vitest';
import { rankTopPercentFromOrder } from '../rank-top-percent.js';

describe('rankTopPercentFromOrder', () => {
  it('uses ceil(rank/total*100)', () => {
    expect(rankTopPercentFromOrder(26, 224)).toBe(12);
    expect(rankTopPercentFromOrder(6, 100)).toBe(6);
    expect(rankTopPercentFromOrder(1, 224)).toBe(1);
    expect(rankTopPercentFromOrder(224, 224)).toBe(100);
  });
});
