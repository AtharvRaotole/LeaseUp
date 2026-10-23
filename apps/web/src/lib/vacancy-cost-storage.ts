import type { VacancyCalculatorDraft } from './vacancy-cost';
import { EMPTY_VACANCY_DRAFT } from './vacancy-cost';

const STORAGE_PREFIX = 'leaseup:vacancy:';

export function vacancyStorageKey(address: string): string {
  return `${STORAGE_PREFIX}${address.trim().toLowerCase()}`;
}

type StoredVacancy = Omit<VacancyCalculatorDraft, 'includeInPitchPack'> & {
  includeInPitchPack?: boolean;
};

export function loadVacancyDraft(address: string): VacancyCalculatorDraft {
  if (!address.trim()) return { ...EMPTY_VACANCY_DRAFT };
  try {
    const raw = localStorage.getItem(vacancyStorageKey(address));
    if (!raw) return { ...EMPTY_VACANCY_DRAFT };
    const parsed = JSON.parse(raw) as StoredVacancy;
    return {
      ...EMPTY_VACANCY_DRAFT,
      ...parsed,
      includeInPitchPack: parsed.includeInPitchPack === true,
    };
  } catch {
    return { ...EMPTY_VACANCY_DRAFT };
  }
}

export function saveVacancyDraft(address: string, draft: VacancyCalculatorDraft): void {
  if (!address.trim()) return;
  try {
    localStorage.setItem(vacancyStorageKey(address), JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}
