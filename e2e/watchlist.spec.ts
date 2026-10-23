import { test, expect } from '@playwright/test';
import { waitForReportReady } from './report-helpers';

const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';

test('save a space and recheck from watchlist', async ({ page }) => {
  await page.goto(WICKER);
  await waitForReportReady(page);

  await page.getByTestId('watch-this-space').click();
  await expect(page.getByTestId('watch-saved-link')).toBeVisible({ timeout: 15_000 });

  await page.getByTestId('watch-saved-link').click();
  await expect(page.getByTestId('watchlist-page')).toBeVisible();
  await expect(page.getByTestId('watch-diff-panel')).toContainText("First check saved");

  await page.getByTestId('watch-recheck').click();
  await expect(page.getByTestId('watch-diff-panel')).not.toContainText("First check saved", {
    timeout: 120_000,
  });
  await expect(page.getByTestId('watch-diff-panel')).toContainText(/No changes in the top 10|Changes since/);
});
