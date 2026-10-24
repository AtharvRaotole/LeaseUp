import type { VacancyCalculatorInput } from '@leaseup/contracts';

export type VacancyCalculatorDraft = {
  squareFeet?: number;
  rentPerSqFtYear?: number;
  monthsVacant?: number;
  expectedMonthsToLeaseWithShortlist?: number;
  expectedMonthsToLeaseWithoutShortlist?: number;
  includeInPitchPack: boolean;
};

export const EMPTY_VACANCY_DRAFT: VacancyCalculatorDraft = {
  includeInPitchPack: false,
};

export type VacancyCostResult = {
  monthlyCarryingCost: number;
  lostRentToDate: number;
  costPerExtraMonth: number;
  /** Set only when both lease timelines are entered and without > with. */
  extraMonthsWithoutShortlist?: number;
  extraCostWithoutShortlist?: number;
};

export function isVacancyMonthlyRateComplete(
  draft: VacancyCalculatorDraft
): draft is VacancyCalculatorDraft & { squareFeet: number; rentPerSqFtYear: number } {
  const { squareFeet, rentPerSqFtYear } = draft;
  return (
    squareFeet !== undefined &&
    rentPerSqFtYear !== undefined &&
    Number.isFinite(squareFeet) &&
    Number.isFinite(rentPerSqFtYear) &&
    squareFeet >= 0 &&
    rentPerSqFtYear >= 0
  );
}

export function monthlyCarryingFromDraft(draft: VacancyCalculatorDraft): number | null {
  if (!isVacancyMonthlyRateComplete(draft)) return null;
  return (draft.squareFeet * draft.rentPerSqFtYear) / 12;
}

export function isVacancyInputComplete(
  draft: VacancyCalculatorDraft
): draft is VacancyCalculatorDraft & VacancyCalculatorInput {
  const { squareFeet, rentPerSqFtYear, monthsVacant } = draft;
  if (
    squareFeet === undefined ||
    rentPerSqFtYear === undefined ||
    monthsVacant === undefined ||
    !Number.isFinite(squareFeet) ||
    !Number.isFinite(rentPerSqFtYear) ||
    !Number.isFinite(monthsVacant) ||
    squareFeet < 0 ||
    rentPerSqFtYear < 0 ||
    monthsVacant < 0
  ) {
    return false;
  }
  return true;
}

export function draftToPitchVacancy(draft: VacancyCalculatorDraft): VacancyCalculatorInput | undefined {
  if (!draft.includeInPitchPack || !isVacancyInputComplete(draft)) {
    return undefined;
  }
  const input: VacancyCalculatorInput = {
    squareFeet: draft.squareFeet,
    rentPerSqFtYear: draft.rentPerSqFtYear,
    monthsVacant: draft.monthsVacant,
  };
  if (draft.expectedMonthsToLeaseWithShortlist !== undefined) {
    input.expectedMonthsToLeaseWithShortlist = draft.expectedMonthsToLeaseWithShortlist;
  }
  if (draft.expectedMonthsToLeaseWithoutShortlist !== undefined) {
    input.expectedMonthsToLeaseWithoutShortlist = draft.expectedMonthsToLeaseWithoutShortlist;
  }
  return input;
}

export function pitchVacancyToDraft(vacancy: VacancyCalculatorInput): VacancyCalculatorDraft {
  return {
    squareFeet: vacancy.squareFeet,
    rentPerSqFtYear: vacancy.rentPerSqFtYear,
    monthsVacant: vacancy.monthsVacant,
    expectedMonthsToLeaseWithShortlist: vacancy.expectedMonthsToLeaseWithShortlist,
    expectedMonthsToLeaseWithoutShortlist: vacancy.expectedMonthsToLeaseWithoutShortlist,
    includeInPitchPack: true,
  };
}

export function computeVacancyCost(input: VacancyCalculatorInput): VacancyCostResult {
  const monthlyCarryingCost = (input.squareFeet * input.rentPerSqFtYear) / 12;
  const lostRentToDate = monthlyCarryingCost * input.monthsVacant;
  const costPerExtraMonth = monthlyCarryingCost;

  const withShortlist = input.expectedMonthsToLeaseWithShortlist;
  const withoutShortlist = input.expectedMonthsToLeaseWithoutShortlist;
  let extraMonthsWithoutShortlist: number | undefined;
  let extraCostWithoutShortlist: number | undefined;

  if (
    withShortlist !== undefined &&
    withoutShortlist !== undefined &&
    Number.isFinite(withShortlist) &&
    Number.isFinite(withoutShortlist) &&
    withoutShortlist > withShortlist
  ) {
    extraMonthsWithoutShortlist = withoutShortlist - withShortlist;
    extraCostWithoutShortlist = extraMonthsWithoutShortlist * monthlyCarryingCost;
  }

  return {
    monthlyCarryingCost,
    lostRentToDate,
    costPerExtraMonth,
    extraMonthsWithoutShortlist,
    extraCostWithoutShortlist,
  };
}

export function parseVacancyNumberField(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}
