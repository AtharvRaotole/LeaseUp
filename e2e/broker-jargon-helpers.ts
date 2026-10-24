import { expect, type Page } from '@playwright/test';
import { findBrokerJargonViolations } from '../apps/web/src/lib/broker-visible-jargon';

export async function collectVisibleBrokerText(page: Page): Promise<string> {
  const roots = page.locator(
    '#main-content, main, [role="main"], [data-testid="pipeline-page"], [data-testid="watchlist-page"], [data-testid="pipeline-card-dialog"], [data-testid="taste-unavailable-banner"]'
  );
  await roots.first().waitFor({ state: 'visible', timeout: 60_000 });
  const chunks = await roots.locator(':visible').allInnerTexts();
  return chunks.join('\n');
}

export async function expectNoBrokerJargon(page: Page, context = 'page'): Promise<void> {
  const text = await collectVisibleBrokerText(page);
  const violations = findBrokerJargonViolations(text);
  expect(violations, `Forbidden jargon on ${context}: ${violations.join(', ')}`).toEqual([]);
}
