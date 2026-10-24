import type { Page } from '@playwright/test';

export async function openReportSection(page: Page, testId: string) {
  const section = page.getByTestId(testId);
  await section.waitFor({ state: 'attached', timeout: 60_000 });
  const trigger = section.locator('button').first();
  const expanded = await trigger.getAttribute('aria-expanded');
  if (expanded === 'false') {
    await trigger.click();
  }
}

export async function waitForReportReady(page: Page) {
  await page.getByTestId('brands-to-pitch').waitFor({ state: 'visible', timeout: 120_000 });
}
