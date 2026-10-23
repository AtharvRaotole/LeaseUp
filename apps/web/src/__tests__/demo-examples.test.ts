import { describe, it, expect } from 'vitest';
import { DEMO_EXAMPLES } from '../data/demo-examples';

describe('DEMO_EXAMPLES', () => {
  it('derives hit rates from fixture backtests (Boulder 8/10, Sevierville 9/10)', () => {
    const boulder = DEMO_EXAMPLES.find((e) => e.id === 'boulder');
    const sevierville = DEMO_EXAMPLES.find((e) => e.id === 'sevierville');
    expect(boulder?.presentInTop10).toBe(8);
    expect(sevierville?.presentInTop10).toBe(9);
    expect(boulder?.hitRateLabel).toContain('8 of 10 already nearby');
    expect(sevierville?.hitRateLabel).toContain('9 of 10 already nearby');
  });
});
