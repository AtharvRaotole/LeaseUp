import type { VacancyCalculatorInput } from '@leaseup/contracts';

export function computeVacancyCost(input: VacancyCalculatorInput): {
  monthlyLostRent: number;
  totalLostRent: number;
} {
  const monthlyLostRent = (input.squareFeet * input.rentPerSqFtYear) / 12;
  const totalLostRent = monthlyLostRent * input.monthsVacant;
  return { monthlyLostRent, totalLostRent };
}

export const DEFAULT_VACANCY_INPUT: VacancyCalculatorInput = {
  squareFeet: 2500,
  rentPerSqFtYear: 45,
  monthsVacant: 6,
};
