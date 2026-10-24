import { formatUsd } from './format-money';

/** Headline when sq ft and asking rent are filled in. */
export function vacancyMonthlyEmptyHeadline(monthlyUsd: number): string {
  return `Every month this space sits empty costs about ${formatUsd(monthlyUsd)}. Your estimate.`;
}

export function vacancyAboveFoldIntro(): string {
  return 'Your numbers only. Placeholders are examples, not LeaseUp data.';
}

export function vacancyAboveFoldPrompt(): string {
  return 'Enter square footage and asking rent to see your monthly vacancy estimate.';
}
