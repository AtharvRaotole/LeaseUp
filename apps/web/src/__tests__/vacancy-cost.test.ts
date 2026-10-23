import { describe, it, expect } from 'vitest';
import { computeVacancyCost } from '../lib/vacancy-cost';

describe('computeVacancyCost', () => {
  it('computes monthly and total lost rent from user inputs', () => {
    const { monthlyLostRent, totalLostRent } = computeVacancyCost({
      squareFeet: 2000,
      rentPerSqFtYear: 60,
      monthsVacant: 3,
    });
    expect(monthlyLostRent).toBe(10_000);
    expect(totalLostRent).toBe(30_000);
  });
});
