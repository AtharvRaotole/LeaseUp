import { describe, it, expect } from 'vitest';
import {
  computeVacancyCost,
  draftToPitchVacancy,
  isVacancyInputComplete,
  isVacancyMonthlyRateComplete,
  monthlyCarryingFromDraft,
  EMPTY_VACANCY_DRAFT,
} from '../lib/vacancy-cost';

describe('computeVacancyCost', () => {
  it('computes carrying cost, lost rent, and per-month cost from user inputs', () => {
    const result = computeVacancyCost({
      squareFeet: 2000,
      rentPerSqFtYear: 60,
      monthsVacant: 3,
    });
    expect(result.monthlyCarryingCost).toBe(10_000);
    expect(result.lostRentToDate).toBe(30_000);
    expect(result.costPerExtraMonth).toBe(10_000);
    expect(result.extraMonthsWithoutShortlist).toBeUndefined();
  });

  it('computes optional timeline delta only when without exceeds with', () => {
    const withTimeline = computeVacancyCost({
      squareFeet: 1000,
      rentPerSqFtYear: 48,
      monthsVacant: 0,
      expectedMonthsToLeaseWithShortlist: 4,
      expectedMonthsToLeaseWithoutShortlist: 7,
    });
    expect(withTimeline.monthlyCarryingCost).toBe(4000);
    expect(withTimeline.extraMonthsWithoutShortlist).toBe(3);
    expect(withTimeline.extraCostWithoutShortlist).toBe(12_000);

    const noDelta = computeVacancyCost({
      squareFeet: 1000,
      rentPerSqFtYear: 48,
      monthsVacant: 0,
      expectedMonthsToLeaseWithShortlist: 8,
      expectedMonthsToLeaseWithoutShortlist: 5,
    });
    expect(noDelta.extraMonthsWithoutShortlist).toBeUndefined();
  });
});

describe('monthly carrying estimate', () => {
  it('needs only sq ft and rent for above-fold headline', () => {
    expect(monthlyCarryingFromDraft(EMPTY_VACANCY_DRAFT)).toBeNull();
    const draft = { ...EMPTY_VACANCY_DRAFT, squareFeet: 2400, rentPerSqFtYear: 48 };
    expect(isVacancyMonthlyRateComplete(draft)).toBe(true);
    expect(monthlyCarryingFromDraft(draft)).toBe(9600);
  });
});

describe('vacancy draft helpers', () => {
  it('requires core fields before pitch export', () => {
    expect(isVacancyInputComplete(EMPTY_VACANCY_DRAFT)).toBe(false);
    expect(
      isVacancyInputComplete({
        ...EMPTY_VACANCY_DRAFT,
        squareFeet: 1000,
        rentPerSqFtYear: 40,
        monthsVacant: 2,
      })
    ).toBe(true);
  });

  it('exports vacancy to pitch only when opted in and complete', () => {
    const complete = {
      includeInPitchPack: true,
      squareFeet: 500,
      rentPerSqFtYear: 30,
      monthsVacant: 1,
    };
    expect(draftToPitchVacancy(complete)?.squareFeet).toBe(500);

    expect(
      draftToPitchVacancy({ ...complete, includeInPitchPack: false })
    ).toBeUndefined();
    expect(draftToPitchVacancy({ includeInPitchPack: true })).toBeUndefined();
  });
});
