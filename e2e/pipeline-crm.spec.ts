import { test, expect } from '@playwright/test';
import { waitForReportReady } from './report-helpers';

const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Pipeline CRM', () => {
  test('save prospect, set status, notes, and reminder', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await waitForReportReady(page);
    await page.getByTestId('report-primary-actions').getByTestId('add-to-pipeline').click();
    await expect(page.getByText('Added to pipeline')).toBeVisible({ timeout: 30_000 });

    await page.goto(`${BASE}/pipeline`);
    await expect(page.getByTestId('pipeline-board')).toBeVisible();
    await page.getByTestId('pipeline-card').first().click();
    await expect(page.getByTestId('pipeline-card-dialog')).toBeVisible();

    await page.getByTestId('pipeline-prospect-status').selectOption('sent_by_me');
    await page.getByTestId('pipeline-notes').fill('Called leasing inbox, waiting on callback.');
    await page.getByTestId('pipeline-notes').blur();
    await page.getByTestId('pipeline-next-step-reminder').fill('2030-06-01');
    await page.getByTestId('pipeline-next-step-reminder').blur();

    await page.keyboard.press('Escape');
    await page.reload();
    await expect(
      page.getByTestId('pipeline-column-sent_by_me').getByTestId('pipeline-card')
    ).toBeVisible();
    await page
      .getByTestId('pipeline-column-sent_by_me')
      .getByTestId('pipeline-card')
      .first()
      .click();
    await expect(page.getByTestId('pipeline-notes')).toHaveValue(/callback/);
    await expect(page.getByTestId('pipeline-prospect-status')).toHaveValue('sent_by_me');
  });

  test('empty pipeline shows honest copy', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${BASE}/pipeline`);
    await expect(page.getByTestId('pipeline-empty')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('pipeline-empty')).toContainText('No prospects saved yet');
  });
});
