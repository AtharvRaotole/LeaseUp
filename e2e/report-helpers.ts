import type { Page } from '@playwright/test';

export async function openReportSection(page: Page, testId: string) {
  const section = page.getByTestId(testId);
  const trigger = section.locator('button').first();
  const expanded = await trigger.getAttribute('aria-expanded');
  if (expanded === 'false') {
    await trigger.click();
  }
}

export async function waitForReportReady(page: Page) {
  await page.getByTestId('report-top-brands').waitFor({ timeout: 120_000 });
}
